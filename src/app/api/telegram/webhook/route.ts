import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate, autoBootTelegramBotIfConfigured, getTelegramBotStatus } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error en /api/telegram/webhook:", err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 200 });
  }
}

export async function GET() {
  await autoBootTelegramBotIfConfigured();
  const status = await getTelegramBotStatus();
  return NextResponse.json({
    ok: true,
    service: "FFH Asociados - Telegram AI Webhook",
    status,
  });
}
