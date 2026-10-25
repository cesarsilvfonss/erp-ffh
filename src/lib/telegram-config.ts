import { prisma } from "./prisma";

export interface RecentTelegramChat {
  chatId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  lastMessage: string;
  lastSeenAt: string;
}

export interface TelegramBotConfig {
  botToken: string;
  geminiApiKey: string;
  allowedChatIds: string[];
  allowAllChats: boolean;
  customInstructions: string;
  pollingEnabled: boolean;
  recentChats: RecentTelegramChat[];
}

const KEYS = {
  BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
  GEMINI_API_KEY: "GEMINI_API_KEY",
  ALLOWED_CHAT_IDS: "TELEGRAM_ALLOWED_CHAT_IDS",
  ALLOW_ALL_CHATS: "TELEGRAM_ALLOW_ALL_CHATS",
  CUSTOM_INSTRUCTIONS: "TELEGRAM_CUSTOM_INSTRUCTIONS",
  POLLING_ENABLED: "TELEGRAM_POLLING_ENABLED",
  RECENT_CHATS: "TELEGRAM_RECENT_CHATS",
} as const;

let cachedConfig: { data: TelegramBotConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateTelegramConfigCache() {
  cachedConfig = null;
}

export async function getTelegramConfig(forceRefresh = false): Promise<TelegramBotConfig> {
  if (!forceRefresh && cachedConfig && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig.data;
  }

  const map = new Map<string, string>();
  try {
    const params = await prisma.parameter.findMany({
      where: {
        key: {
          in: Object.values(KEYS),
        },
      },
    });
    for (const p of params) {
      map.set(p.key, p.value);
    }
  } catch (err) {
    console.warn("Aviso leyendo Parameter para Telegram (usando fallback .env):", err);
  }

  const botToken = (map.get(KEYS.BOT_TOKEN) || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const geminiApiKey = (map.get(KEYS.GEMINI_API_KEY) || process.env.GEMINI_API_KEY || "").trim();

  const rawAllowed = map.get(KEYS.ALLOWED_CHAT_IDS) ?? process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "";
  const allowedChatIds = rawAllowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Por defecto true si no se restringió explícitamente a false
  const allowAllChats = (map.get(KEYS.ALLOW_ALL_CHATS) ?? "true") === "true";
  const pollingEnabled = (map.get(KEYS.POLLING_ENABLED) ?? "true") === "true";
  const customInstructions = map.get(KEYS.CUSTOM_INSTRUCTIONS) || "";

  let recentChats: RecentTelegramChat[] = [];
  const rawRecent = map.get(KEYS.RECENT_CHATS);
  if (rawRecent) {
    try {
      recentChats = JSON.parse(rawRecent);
    } catch {
      recentChats = [];
    }
  }

  const result: TelegramBotConfig = {
    botToken,
    geminiApiKey,
    allowedChatIds,
    allowAllChats,
    customInstructions,
    pollingEnabled,
    recentChats,
  };

  cachedConfig = {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return result;
}

export async function saveTelegramConfig(input: {
  botToken?: string;
  geminiApiKey?: string;
  allowedChatIds?: string[];
  allowAllChats?: boolean;
  customInstructions?: string;
  pollingEnabled?: boolean;
}) {
  const updates: Array<{ key: string; value: string; description: string }> = [];

  if (input.botToken !== undefined) {
    updates.push({
      key: KEYS.BOT_TOKEN,
      value: input.botToken.trim(),
      description: "Token del Bot de Telegram (@BotFather)",
    });
  }

  if (input.geminiApiKey !== undefined) {
    updates.push({
      key: KEYS.GEMINI_API_KEY,
      value: input.geminiApiKey.trim(),
      description: "API Key de Google Gemini para el asistente de Telegram",
    });
  }

  if (input.allowedChatIds !== undefined) {
    updates.push({
      key: KEYS.ALLOWED_CHAT_IDS,
      value: input.allowedChatIds.map((id) => id.trim()).filter(Boolean).join(","),
      description: "IDs de chat de Telegram autorizados (separados por coma)",
    });
  }

  if (input.allowAllChats !== undefined) {
    updates.push({
      key: KEYS.ALLOW_ALL_CHATS,
      value: input.allowAllChats ? "true" : "false",
      description: "Permitir acceso a cualquier usuario que escriba al bot",
    });
  }

  if (input.customInstructions !== undefined) {
    updates.push({
      key: KEYS.CUSTOM_INSTRUCTIONS,
      value: input.customInstructions,
      description: "Instrucciones personalizadas adicionales para el bot",
    });
  }

  if (input.pollingEnabled !== undefined) {
    updates.push({
      key: KEYS.POLLING_ENABLED,
      value: input.pollingEnabled ? "true" : "false",
      description: "Activar Long Polling automático de Telegram",
    });
  }

  for (const item of updates) {
    await prisma.parameter.upsert({
      where: { key: item.key },
      update: { value: item.value, description: item.description },
      create: { key: item.key, value: item.value, description: item.description },
    });
  }

  invalidateTelegramConfigCache();
}

export async function recordRecentTelegramChat(chat: RecentTelegramChat) {
  try {
    const existingParam = await prisma.parameter.findUnique({
      where: { key: KEYS.RECENT_CHATS },
    });

    let list: RecentTelegramChat[] = [];
    if (existingParam?.value) {
      try {
        list = JSON.parse(existingParam.value);
      } catch {
        list = [];
      }
    }

    const filtered = list.filter((c) => c.chatId !== chat.chatId);
    filtered.unshift(chat);
    const trimmed = filtered.slice(0, 20);

    await prisma.parameter.upsert({
      where: { key: KEYS.RECENT_CHATS },
      update: { value: JSON.stringify(trimmed) },
      create: {
        key: KEYS.RECENT_CHATS,
        value: JSON.stringify(trimmed),
        description: "Últimos chats que interactuaron con el bot de Telegram",
      },
    });
    invalidateTelegramConfigCache();
  } catch (err) {
    console.error("Error guardando chat reciente de Telegram:", err);
  }
}
