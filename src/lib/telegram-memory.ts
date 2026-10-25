import { prisma } from "./prisma";
import { formatDatePY } from "./dates";

export interface StoredChatTurn {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface LongTermMemoryItem {
  id: string;
  fact: string;
  createdAt: string;
}

const HISTORY_KEY_PREFIX = "TELEGRAM_CHAT_HISTORY_";
const LONG_MEMORY_KEY_PREFIX = "TELEGRAM_LONG_MEMORY_";
const MAX_STORED_TURNS = 30; // 15 preguntas + 15 respuestas persistidas en BD

/**
 * Obtiene el historial de conversación persistido en PostgreSQL para un chatId.
 */
export async function getPersistentChatHistory(chatId: string): Promise<StoredChatTurn[]> {
  try {
    const key = `${HISTORY_KEY_PREFIX}${chatId}`;
    const param = await prisma.parameter.findUnique({ where: { key } });
    if (!param?.value) return [];
    const parsed = JSON.parse(param.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error leyendo historial persistente de chat:", err);
    return [];
  }
}

/**
 * Guarda un nuevo intercambio (pregunta del usuario y respuesta del bot) en PostgreSQL.
 */
export async function appendPersistentChatHistory(
  chatId: string,
  userText: string,
  modelReply: string
): Promise<void> {
  try {
    const key = `${HISTORY_KEY_PREFIX}${chatId}`;
    const current = await getPersistentChatHistory(chatId);
    const nowIso = new Date().toISOString();

    current.push({
      role: "user",
      text: userText,
      timestamp: nowIso,
    });
    current.push({
      role: "model",
      text: modelReply,
      timestamp: nowIso,
    });

    const trimmed = current.slice(-MAX_STORED_TURNS);

    await prisma.parameter.upsert({
      where: { key },
      update: { value: JSON.stringify(trimmed) },
      create: {
        key,
        value: JSON.stringify(trimmed),
        description: `Historial de conversación de Telegram para chat ${chatId}`,
      },
    });
  } catch (err) {
    console.error("Error guardando historial persistente de chat:", err);
  }
}

/**
 * Limpia el historial reciente de conversación de un chatId en PostgreSQL.
 */
export async function clearPersistentChatHistory(chatId: string): Promise<void> {
  try {
    const key = `${HISTORY_KEY_PREFIX}${chatId}`;
    await prisma.parameter.deleteMany({ where: { key } });
  } catch (err) {
    console.error("Error limpiando historial de chat:", err);
  }
}

/**
 * Obtiene los recuerdos / notas a largo plazo guardados para un usuario (o globales).
 */
export async function getLongTermMemory(chatId: string): Promise<LongTermMemoryItem[]> {
  try {
    const key = `${LONG_MEMORY_KEY_PREFIX}${chatId}`;
    const param = await prisma.parameter.findUnique({ where: { key } });
    if (!param?.value) return [];
    const parsed = JSON.parse(param.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error leyendo memoria a largo plazo:", err);
    return [];
  }
}

/**
 * Guarda un hecho, preferencia o recordatorio importante en la memoria permanente del chat.
 */
export async function addLongTermMemory(
  chatId: string,
  fact: string
): Promise<{ success: boolean; totalRecuerdos: number; guardado: string }> {
  const cleanFact = fact.trim();
  if (!cleanFact) {
    return { success: false, totalRecuerdos: 0, guardado: "" };
  }

  const key = `${LONG_MEMORY_KEY_PREFIX}${chatId}`;
  const current = await getLongTermMemory(chatId);

  // Evitar duplicados exactos
  const exists = current.some((m) => m.fact.toLowerCase() === cleanFact.toLowerCase());
  if (!exists) {
    current.push({
      id: String(Date.now()),
      fact: cleanFact,
      createdAt: formatDatePY(new Date(), true),
    });
  }

  const trimmed = current.slice(-50); // hasta 50 notas permanentes por usuario

  await prisma.parameter.upsert({
    where: { key },
    update: { value: JSON.stringify(trimmed) },
    create: {
      key,
      value: JSON.stringify(trimmed),
      description: `Memoria a largo plazo de Telegram para chat ${chatId}`,
    },
  });

  return {
    success: true,
    totalRecuerdos: trimmed.length,
    guardado: cleanFact,
  };
}

/**
 * Borra un recuerdo o toda la memoria a largo plazo de un chat.
 */
export async function clearLongTermMemory(chatId: string): Promise<void> {
  try {
    const key = `${LONG_MEMORY_KEY_PREFIX}${chatId}`;
    await prisma.parameter.deleteMany({ where: { key } });
  } catch (err) {
    console.error("Error borrando memoria a largo plazo:", err);
  }
}
