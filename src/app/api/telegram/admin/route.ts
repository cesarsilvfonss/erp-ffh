import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getTelegramConfig, saveTelegramConfig } from "@/lib/telegram-config";
import {
  getTelegramBotStatus,
  startTelegramPolling,
  stopTelegramPolling,
  setTelegramWebhook,
  sendTelegramMessage,
} from "@/lib/telegram-bot";
import { askErpGeminiAssistant } from "@/lib/gemini-assistant";

export const dynamic = "force-dynamic";

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "ADMINISTRATION"].includes(session.user.role)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [config, status] = await Promise.all([
    getTelegramConfig(),
    getTelegramBotStatus(),
  ]);

  return NextResponse.json({
    config: {
      botTokenMasked: config.botToken
        ? `${config.botToken.slice(0, 8)}...${config.botToken.slice(-4)}`
        : "",
      hasBotToken: !!config.botToken,
      geminiApiKeyMasked: config.geminiApiKey
        ? `${config.geminiApiKey.slice(0, 6)}...${config.geminiApiKey.slice(-4)}`
        : "",
      hasGeminiKey: !!config.geminiApiKey,
      allowedChatIds: config.allowedChatIds,
      allowAllChats: config.allowAllChats,
      customInstructions: config.customInstructions,
      pollingEnabled: config.pollingEnabled,
      recentChats: config.recentChats,
    },
    status,
  });
}

export async function POST(req: NextRequest) {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "save_config") {
      const updatePayload: any = {};
      if (typeof body.botToken === "string" && body.botToken.trim() !== "") {
        updatePayload.botToken = body.botToken.trim();
      }
      if (typeof body.geminiApiKey === "string" && body.geminiApiKey.trim() !== "") {
        updatePayload.geminiApiKey = body.geminiApiKey.trim();
      }
      if (Array.isArray(body.allowedChatIds)) {
        updatePayload.allowedChatIds = body.allowedChatIds;
      }
      if (typeof body.allowAllChats === "boolean") {
        updatePayload.allowAllChats = body.allowAllChats;
      }
      if (typeof body.customInstructions === "string") {
        updatePayload.customInstructions = body.customInstructions;
      }

      await saveTelegramConfig(updatePayload);

      // Si ya tiene token y polling estaba activo, iniciamos o reconectamos el bot automáticamente
      const cfg = await getTelegramConfig();
      let startResult = null;
      if (cfg.botToken && cfg.pollingEnabled) {
        startResult = await startTelegramPolling();
      }

      return NextResponse.json({
        success: true,
        message: "Configuración guardada correctamente.",
        startResult,
      });
    }

    if (action === "authorize_chat") {
      const chatId = String(body.chatId || "").trim();
      if (!chatId) {
        return NextResponse.json({ error: "Falta chatId" }, { status: 400 });
      }
      const cfg = await getTelegramConfig();
      const set = new Set(cfg.allowedChatIds);
      set.add(chatId);
      await saveTelegramConfig({ allowedChatIds: Array.from(set) });

      if (cfg.botToken) {
        await sendTelegramMessage(
          cfg.botToken,
          chatId,
          "✅ *¡Tu cuenta ha sido autorizada!*\n\nYa puedes preguntarme cualquier cosa sobre *FFH Asociados* por texto, por nota de voz 🎤 o usando los botones de abajo.",
          true
        );
      }

      return NextResponse.json({
        success: true,
        message: `Chat ${chatId} autorizado y notificado por Telegram.`,
      });
    }

    if (action === "revoke_chat") {
      const chatId = String(body.chatId || "").trim();
      const cfg = await getTelegramConfig();
      const filtered = cfg.allowedChatIds.filter((id) => id !== chatId);
      await saveTelegramConfig({ allowedChatIds: filtered });
      return NextResponse.json({
        success: true,
        message: `Permiso revocado para el chat ${chatId}.`,
      });
    }

    if (action === "start_polling") {
      const result = await startTelegramPolling();
      return NextResponse.json(result);
    }

    if (action === "stop_polling") {
      const result = await stopTelegramPolling();
      return NextResponse.json(result);
    }

    if (action === "set_webhook") {
      const result = await setTelegramWebhook(String(body.webhookUrl || ""));
      return NextResponse.json(result);
    }

    if (action === "test_question") {
      const question = String(body.question || "").trim();
      if (!question) {
        return NextResponse.json({ error: "Escribe una pregunta para probar." }, { status: 400 });
      }
      const reply = await askErpGeminiAssistant({
        chatId: `web-test-${session.user.id}`,
        text: question,
        userName: session.user.name || "Admin",
      });
      return NextResponse.json({ success: true, reply });
    }

    if (action === "clear_simulator_memory") {
      const { clearChatHistory } = await import("@/lib/gemini-assistant");
      await clearChatHistory(`web-test-${session.user.id}`, true);
      return NextResponse.json({
        success: true,
        message: "Memoria del simulador reiniciada.",
      });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/telegram/admin:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
