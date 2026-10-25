import {
  getTelegramConfig,
  recordRecentTelegramChat,
  saveTelegramConfig,
} from "./telegram-config";
import { askErpGeminiAssistant, clearChatHistory } from "./gemini-assistant";
import { ipv4PostJson, ipv4DownloadBuffer } from "./ipv4-https";

export const MAIN_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Resumen General" }, { text: "🏦 Saldos en Bancos" }],
    [{ text: "🥩 Stock Cámara y Pie" }, { text: "💰 Quién nos debe" }],
    [{ text: "📉 A quién debemos" }, { text: "🧾 Cheques en Cartera" }],
    [{ text: "🐄 Últimos Lotes" }, { text: "📈 Ventas y Gastos" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Prompts optimizados para cuando el papá toca uno de los botones rápidos
const QUICK_BUTTON_PROMPTS: Record<string, string> = {
  "📊 Resumen General":
    "Dame el resumen general del negocio hoy: capital total actual, utilidad del período abierto, saldos en bancos, stock en cámara y en pie, cuentas por cobrar y por pagar, cheques en cartera y cómo va el período.",
  "🏦 Saldos en Bancos":
    "Muéstrame el saldo actual de cada cuenta bancaria y caja, el total general en bancos y los últimos 5 movimientos más importantes.",
  "🥩 Stock Cámara y Pie":
    "Muéstrame cuánto stock tenemos hoy en cámara frigorífica (kilos y valor por producto y lote) y cuánto stock tenemos en pie sin faenar.",
  "💰 Quién nos debe":
    "Muéstrame el listado de cuentas por cobrar pendientes: qué clientes nos deben plata, cuánto debe cada uno y el total general por cobrar.",
  "📉 A quién debemos":
    "Muéstrame las cuentas por pagar pendientes: a qué proveedores les debemos, por qué concepto, cuánto a cada uno y el total general a pagar.",
  "🧾 Cheques en Cartera":
    "Muéstrame todos los cheques en cartera pendientes de depositar, quién los entregó, de qué banco son, cuándo vencen y el monto total.",
  "🐄 Últimos Lotes":
    "Muéstrame un resumen de los últimos 8 lotes de hacienda comprados, su proveedor, cabezas, peso, rendimiento de faena y rentabilidad.",
  "📈 Ventas y Gastos":
    "Muéstrame un resumen de las últimas ventas realizadas y el resumen de gastos operativos por categoría del período actual.",
};

async function telegramApi(token: string, method: string, body?: any) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const { data } = await ipv4PostJson(url, body ?? {}, 35000);
  return data;
}

export async function sendTelegramChatAction(
  token: string,
  chatId: string | number,
  action: "typing" | "record_voice" = "typing"
) {
  try {
    await telegramApi(token, "sendChatAction", {
      chat_id: chatId,
      action,
    });
  } catch {
    // Ignorar errores leves de chat action
  }
}

export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  withKeyboard = true
) {
  const maxLen = 3800;
  const chunks: string[] = [];
  let remaining = text.trim() || "Sin respuesta.";

  while (remaining.length > maxLen) {
    let splitIdx = remaining.lastIndexOf("\n", maxLen);
    if (splitIdx < 1000) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trim();
  }
  if (remaining) chunks.push(remaining);

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const replyMarkup = isLast && withKeyboard ? MAIN_REPLY_KEYBOARD : undefined;

    // Intentamos primero con Markdown para que se vean negritas; si falla el parseo en Telegram, enviamos texto plano
    const res = await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    });

    if (!res?.ok) {
      await telegramApi(token, "sendMessage", {
        chat_id: chatId,
        text: chunks[i],
        reply_markup: replyMarkup,
      });
    }
  }
}

async function downloadTelegramFileAsBase64(
  token: string,
  fileId: string
): Promise<{ base64: string; filePath: string }> {
  const fileInfo = await telegramApi(token, "getFile", { file_id: fileId });
  if (!fileInfo?.ok || !fileInfo?.result?.file_path) {
    throw new Error("No se pudo obtener el archivo de audio desde Telegram.");
  }

  const filePath: string = fileInfo.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const buffer = await ipv4DownloadBuffer(fileUrl, 25000);
  const base64 = buffer.toString("base64");
  return { base64, filePath };
}

export async function handleTelegramUpdate(update: any) {
  try {
    const message = update?.message || update?.edited_message;
    if (!message || !message.chat) return;

    const config = await getTelegramConfig();
    if (!config.botToken) return;

    const chatId = String(message.chat.id);
    const firstName = message.from?.first_name || message.chat.first_name || "Usuario";
    const lastName = message.from?.last_name || message.chat.last_name || "";
    const username = message.from?.username || message.chat.username || "";
    const textInput: string = (message.text || message.caption || "").trim();
    const voice = message.voice || message.audio;

    // Registramos el intento/mensaje para que aparezca en el panel de Configuración del ERP
    await recordRecentTelegramChat({
      chatId,
      firstName,
      lastName,
      username,
      lastMessage: voice ? "🎤 [Nota de voz / Audio]" : textInput.slice(0, 100) || "[Mensaje]",
      lastSeenAt: new Date().toISOString(),
    });

    // Verificación de seguridad: ¿está autorizado este Chat ID?
    const isAuthorized =
      config.allowAllChats || config.allowedChatIds.includes(chatId);

    if (!isAuthorized) {
      await sendTelegramMessage(
        config.botToken,
        chatId,
        `🔒 *Hola ${firstName}*.\n\n` +
          `Tu cuenta de Telegram aún no está autorizada para consultar los datos de *FFH Asociados*.\n\n` +
          `📌 Tu ID de Telegram es: \`${chatId}\`\n\n` +
          `Pídele al administrador que entre al sistema ERP en *Definiciones → Asistente Telegram* y presione el botón *"Autorizar"* junto a tu nombre.`,
        false
      );
      return;
    }

    // Comandos básicos
    if (textInput === "/start" || textInput.toLowerCase() === "hola" || textInput === "/ayuda") {
      await sendTelegramMessage(
        config.botToken,
        chatId,
        `👋 *¡Hola ${firstName}! Bienvenido al Asistente de FFH Asociados.*\n\n` +
          `Puedes consultarme cualquier dato del sistema en tiempo real de 3 formas muy fáciles:\n\n` +
          `1️⃣ *Tocando los botones de abajo* (📊 Resumen, 🏦 Bancos, 🥩 Stock, 💰 Deudas, etc.).\n` +
          `2️⃣ *Enviándome un audio (nota de voz)* 🎤 preguntándome con tus palabras lo que quieras saber.\n` +
          `3️⃣ *Escribiéndome cualquier pregunta*, por ejemplo:\n` +
          `   • _"¿Cuánto tenemos en los bancos?"_\n` +
          `   • _"¿Cuánto nos debe cada cliente?"_\n` +
          `   • _"¿Cómo salió la faena del último lote?"_\n` +
          `   • _"¿Cuántos kilos de carne hay en cámara?"_\n\n` +
          `¿Qué te gustaría consultar ahora?`,
        true
      );
      return;
    }

    if (textInput === "/limpiar") {
      await clearChatHistory(chatId, false);
      await sendTelegramMessage(
        config.botToken,
        chatId,
        "🧹 Historial de conversación reciente limpiado (tus notas y preferencias importantes siguen guardadas). ¿Qué deseas consultar ahora?",
        true
      );
      return;
    }

    if (textInput === "/olvidar") {
      await clearChatHistory(chatId, true);
      await sendTelegramMessage(
        config.botToken,
        chatId,
        "🗑️ Se borró todo el historial de conversación y la memoria permanente de este chat.",
        true
      );
      return;
    }

    if (textInput === "/id") {
      await sendTelegramMessage(
        config.botToken,
        chatId,
        `📌 Tu ID de chat de Telegram es: \`${chatId}\``,
        true
      );
      return;
    }

    // Indicador de "escribiendo..." mientras consulta Prisma + Gemini
    await sendTelegramChatAction(config.botToken, chatId, "typing");
    const typingInterval = setInterval(() => {
      sendTelegramChatAction(config.botToken, chatId, "typing");
    }, 4000);

    try {
      let reply: string;

      if (voice?.file_id) {
        const { base64 } = await downloadTelegramFileAsBase64(config.botToken, voice.file_id);
        const mimeType = voice.mime_type || "audio/ogg";
        reply = await askErpGeminiAssistant({
          chatId,
          text: textInput || undefined,
          audioBase64: base64,
          audioMimeType: mimeType,
          userName: firstName,
        });
      } else if (textInput) {
        const mappedPrompt = QUICK_BUTTON_PROMPTS[textInput] || textInput;
        reply = await askErpGeminiAssistant({
          chatId,
          text: mappedPrompt,
          userName: firstName,
        });
      } else {
        reply =
          "Por favor envíame una pregunta por texto, una nota de voz 🎤 o toca uno de los botones de abajo.";
      }

      clearInterval(typingInterval);
      await sendTelegramMessage(config.botToken, chatId, reply, true);
    } catch (innerErr: any) {
      clearInterval(typingInterval);
      console.error("Error procesando consulta de Telegram:", innerErr);
      await sendTelegramMessage(
        config.botToken,
        chatId,
        `⚠️ Ocurrió un inconveniente al procesar la consulta: ${
          innerErr?.message || "Error interno"
        }`,
        true
      );
    }
  } catch (err) {
    console.error("Error general en handleTelegramUpdate:", err);
  }
}

// ============================================================================
// GESTIÓN DE LONG POLLING Y WEBHOOK
// ============================================================================
interface PollingState {
  isRunning: boolean;
  stopRequested: boolean;
  lastUpdateId: number;
  botInfo: { id?: number; username?: string; firstName?: string } | null;
  lastError: string | null;
  startedAt: string | null;
}

const globalForTelegram = global as unknown as {
  telegramPollingState?: PollingState;
  telegramPollingStateV2?: PollingState;
  telegramPollingStateV3?: PollingState;
};

function getState(): PollingState {
  // Detener cualquier loop antiguo previo al hot-reload
  if (globalForTelegram.telegramPollingState) {
    globalForTelegram.telegramPollingState.stopRequested = true;
    globalForTelegram.telegramPollingState.isRunning = false;
  }
  if (globalForTelegram.telegramPollingStateV2) {
    globalForTelegram.telegramPollingStateV2.stopRequested = true;
    globalForTelegram.telegramPollingStateV2.isRunning = false;
  }

  if (!globalForTelegram.telegramPollingStateV3) {
    globalForTelegram.telegramPollingStateV3 = {
      isRunning: false,
      stopRequested: false,
      lastUpdateId: 0,
      botInfo: null,
      lastError: null,
      startedAt: null,
    };
  }
  return globalForTelegram.telegramPollingStateV3;
}

export async function getTelegramBotStatus() {
  const config = await getTelegramConfig();
  const state = getState();

  let botInfo = state.botInfo;
  let webhookUrl = "";

  if (config.botToken) {
    try {
      const [meRes, whRes] = await Promise.all([
        telegramApi(config.botToken, "getMe"),
        telegramApi(config.botToken, "getWebhookInfo"),
      ]);
      if (meRes?.ok) {
        botInfo = {
          id: meRes.result.id,
          username: meRes.result.username,
          firstName: meRes.result.first_name,
        };
        state.botInfo = botInfo;
      } else {
        state.lastError = meRes?.description || "Token de Telegram inválido";
      }
      if (whRes?.ok && whRes.result?.url) {
        webhookUrl = whRes.result.url;
      }
    } catch (err: any) {
      state.lastError = err.message;
    }
  }

  return {
    hasBotToken: !!config.botToken,
    hasGeminiKey: !!config.geminiApiKey,
    isPollingRunning: state.isRunning,
    startedAt: state.startedAt,
    lastError: state.lastError,
    botInfo,
    webhookUrl,
  };
}

export async function startTelegramPolling(): Promise<{
  success: boolean;
  message: string;
}> {
  const state = getState();
  const config = await getTelegramConfig();

  if (!config.botToken) {
    return { success: false, message: "Falta configurar el Token del Bot de Telegram." };
  }

  const meRes = await telegramApi(config.botToken, "getMe");
  if (!meRes?.ok) {
    state.lastError = meRes?.description || "Token inválido";
    return {
      success: false,
      message: `Token de Telegram inválido: ${state.lastError}`,
    };
  }

  state.botInfo = {
    id: meRes.result.id,
    username: meRes.result.username,
    firstName: meRes.result.first_name,
  };

  // Eliminamos cualquier webhook activo para que getUpdates (Long Polling) funcione sin conflicto
  await telegramApi(config.botToken, "deleteWebhook", { drop_pending_updates: false });
  await saveTelegramConfig({ pollingEnabled: true });

  if (state.isRunning) {
    return {
      success: true,
      message: `El bot @${state.botInfo.username} ya está escuchando mensajes activamente.`,
    };
  }

  state.isRunning = true;
  state.stopRequested = false;
  state.lastError = null;
  state.startedAt = new Date().toISOString();

  // Bucle asíncrono en segundo plano
  (async () => {
    console.log(`🤖 [Telegram Bot] Long Polling iniciado para @${state.botInfo?.username}`);
    while (!state.stopRequested) {
      try {
        const currentConfig = await getTelegramConfig();
        if (!currentConfig.botToken || !currentConfig.pollingEnabled) {
          break;
        }

        const updatesRes = await telegramApi(currentConfig.botToken, "getUpdates", {
          offset: state.lastUpdateId + 1,
          timeout: 20,
          allowed_updates: ["message", "edited_message"],
        });

        if (!updatesRes?.ok) {
          state.lastError = updatesRes?.description || "Error en getUpdates";
          // Si hay conflicto (409) o error de red, esperamos 5 segundos
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        state.lastError = null;
        const updates: any[] = updatesRes.result || [];
        for (const upd of updates) {
          if (upd.update_id > state.lastUpdateId) {
            state.lastUpdateId = upd.update_id;
          }
          // Procesar sin bloquear el loop
          handleTelegramUpdate(upd).catch((e) =>
            console.error("Error en handleTelegramUpdate:", e)
          );
        }
      } catch (err: any) {
        state.lastError = err?.message || "Error de conexión en Long Polling";
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    state.isRunning = false;
    console.log("🛑 [Telegram Bot] Long Polling detenido.");
  })();

  return {
    success: true,
    message: `Bot @${state.botInfo.username} conectado y escuchando mensajes.`,
  };
}

export async function stopTelegramPolling() {
  const state = getState();
  state.stopRequested = true;
  await saveTelegramConfig({ pollingEnabled: false });
  return { success: true, message: "Se solicitó detener el Long Polling." };
}

export async function setTelegramWebhook(webhookUrl: string) {
  const config = await getTelegramConfig();
  if (!config.botToken) {
    return { success: false, message: "Falta configurar el Token del Bot de Telegram." };
  }

  // Detenemos polling local si se activa webhook
  const state = getState();
  state.stopRequested = true;
  await saveTelegramConfig({ pollingEnabled: false });

  const res = await telegramApi(config.botToken, "setWebhook", {
    url: webhookUrl.trim(),
    allowed_updates: ["message", "edited_message"],
  });

  if (!res?.ok) {
    return {
      success: false,
      message: res?.description || "Error configurando el Webhook en Telegram.",
    };
  }

  return {
    success: true,
    message: `Webhook configurado exitosamente en: ${webhookUrl}`,
  };
}

const globalKeepAlive = global as unknown as { ffhKeepAliveStarted?: boolean };

export async function autoBootTelegramBotIfConfigured() {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) return;

    const renderUrl = (
      process.env.RENDER_EXTERNAL_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      ""
    )
      .trim()
      .replace(/\/+$/, "");

    // Si estamos corriendo en Render (nube), registrar automáticamente el Webhook y activar Keep-Alive cada 10 min
    if (renderUrl && renderUrl.startsWith("https://")) {
      const webhookEndpoint = `${renderUrl}/api/telegram/webhook`;
      const state = getState();
      state.stopRequested = true;

      const whRes = await telegramApi(config.botToken, "getWebhookInfo");
      if (!whRes?.ok || whRes.result?.url !== webhookEndpoint) {
        await telegramApi(config.botToken, "setWebhook", {
          url: webhookEndpoint,
          allowed_updates: ["message", "edited_message"],
        });
        console.log(`✅ [Telegram Bot FFH] Webhook auto-registrado en: ${webhookEndpoint}`);
      }

      if (!globalKeepAlive.ffhKeepAliveStarted) {
        globalKeepAlive.ffhKeepAliveStarted = true;
        const TEN_MINUTES_MS = 10 * 60 * 1000;
        setInterval(async () => {
          try {
            await ipv4PostJson(webhookEndpoint, undefined, 15000);
          } catch {
            // Ignorar errores de keep-alive
          }
        }, TEN_MINUTES_MS);
      }
      return;
    }

    // Si estamos en local: verificar si ya existe un Webhook en la nube
    const whRes = await telegramApi(config.botToken, "getWebhookInfo");
    if (whRes?.ok && whRes.result?.url) {
      // Ya tiene un Webhook configurado en producción, detenemos cualquier polling local para no interferir
      const state = getState();
      state.stopRequested = true;
      return;
    }

    if (!config.pollingEnabled) return;
    await startTelegramPolling();
  } catch (err) {
    console.error("No se pudo auto-iniciar el bot de Telegram:", err);
  }
}
