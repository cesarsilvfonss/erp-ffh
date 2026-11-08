import { GEMINI_TOOLS_DECLARATIONS, executeErpTool } from "./erp-ai-tools";
import { getTelegramConfig } from "./telegram-config";
import { todayPY, formatDatePY, startOfDayPY } from "./dates";
import { ipv4PostJson } from "./ipv4-https";
import {
  getPersistentChatHistory,
  appendPersistentChatHistory,
  clearPersistentChatHistory,
  getLongTermMemory,
  addLongTermMemory,
  clearLongTermMemory,
  LongTermMemoryItem,
} from "./telegram-memory";

export async function clearChatHistory(chatId: string, includeLongTerm = false) {
  await clearPersistentChatHistory(chatId);
  if (includeLongTerm) {
    await clearLongTermMemory(chatId);
  }
}

const MEMORY_TOOL_DECLARATIONS = [
  {
    name: "guardarEnMemoriaPermanente",
    description:
      "Guarda un dato importante, preferencia del usuario, apodo de un cliente/proveedor, recordatorio o instrucción personalizada en la memoria permanente de la base de datos para recordarlo siempre en futuras conversaciones.",
    parameters: {
      type: "OBJECT",
      properties: {
        recuerdo: {
          type: "STRING",
          description:
            "El hecho, preferencia, nota o recordatorio a guardar permanentemente (ej: 'Al usuario le gusta ver primero el saldo de Banco Atlas', 'El proveedor Don Juan es Agroganadera San José').",
        },
      },
      required: ["recuerdo"],
    },
  },
  {
    name: "consultarMemoriaPermanente",
    description:
      "Consulta todas las notas, preferencias y recuerdos guardados en la memoria permanente de este usuario.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

function buildSystemInstruction(
  customInstructions?: string,
  longTermMemories?: LongTermMemoryItem[],
  userName?: string
): string {
  const hoyYmd = todayPY();
  const hoyLegible = formatDatePY(startOfDayPY(hoyYmd));

  const memoriesText =
    longTermMemories && longTermMemories.length > 0
      ? `\nMEMORIA PERMANENTE GUARDADA SOBRE ESTE USUARIO (${userName || "Usuario"}):\n` +
        longTermMemories.map((m) => `- [${m.createdAt}] ${m.fact}`).join("\n")
      : "\nMEMORIA PERMANENTE: Aún no hay notas específicas guardadas para este usuario.";

  return `Eres el Asistente Inteligente de "FFH Asociados" (ERP Ganadero y Frigorífico en Paraguay).
Tu objetivo principal es ayudar al dueño / directivo del negocio (el papá del administrador) a consultar cualquier dato real del sistema de forma sumamente sencilla, clara, amable y directa por Telegram.

FECHA ACTUAL EN ASUNCIÓN, PARAGUAY: ${hoyLegible} (formato YYYY-MM-DD: ${hoyYmd}).
USUARIO ACTUAL: ${userName || "Directivo"}.

🚨 PROHIBICIÓN ABSOLUTA DE ALUCINAR O INVENTAR DATOS (REGLA INQUEBRANTABLE) 🚨
1. BAJO NINGUNA HIPÓTESIS puedes inventar, adivinar, estimar, suponer, extrapolar ni deducir ningún dato, cifra, monto en Guaraníes, peso en kilos, porcentaje, fecha, RUC, teléfono, número de factura, categoría de animal, nombre de persona o cualquier otra información.
2. SI NO TIENES UNA INFORMACIÓN O NO ESTÁ EN EL SISTEMA, DILO EXPLÍCITAMENTE:
   - Si un dato aparece como "No registrado en el sistema", "No disponible", nulo o vacío en el resultado de las herramientas, o si el usuario pregunta por algo que el sistema no registra (ej. nombre del chofer, chapa del camión, potrero, edad del animal, clima, etc.), DEBES responder explícitamente:
     👉 "No tengo esa información registrada en el sistema." (o en portugués: "Não tenho essa informação registrada no sistema.").
   - Jamás rellenes espacios vacíos con datos inventados ni con suposiciones.
3. PROHIBIDO RESPONDER CIFRAS USANDO SOLO EL HISTORIAL DE CHAT:
   - Aunque el usuario te pida "agregá tal dato al resumen anterior", "calculá el porcentaje sobre lo que me mostraste" o "volvé a mostrarme la lista con tal cambio", SIEMPRE estás obligado a ejecutar nuevamente la herramienta de base de datos correspondiente (\`consultarLotesYFaenas\`, \`obtenerResumenGeneralYCapital\`, etc.) en el turno actual.
   - NUNCA intentes despejar o deducir un valor (como el valor de compra de un lote) sumando o restando cifras de un mensaje anterior tuyo. Usa exclusivamente los campos exactos que devuelve la herramienta de la base de datos en este turno.
   - Si el usuario te pide guardar una preferencia y además ver el reporte actualizado, llama TANTO a \`guardarEnMemoriaPermanente\` COMO a la herramienta de consulta del ERP correspondiente antes de darle la respuesta final.

TIENES MEMORIA CONVERSACIONAL Y PERMANENTE:
- Tienes acceso al historial de mensajes anteriores de la conversación para entender a qué cliente, proveedor o lote se refiere el usuario en preguntas de seguimiento, pero para dar cualquier dato o número SIEMPRE debes consultar la herramienta del ERP.
- Si el usuario te pide que recuerdes algo (ej. "acordate que...", "guardá en tu memoria que...", "quiero que tal valor aparezca en el resumen..."), llama a la herramienta \`guardarEnMemoriaPermanente\` para que nunca se olvide.
${memoriesText}

REGLAS IMPORTANTES DE COMUNICACIÓN:
1. Responde en el mismo idioma en que te hable o escriba el usuario (Español o Portugués), de forma muy clara, cálida, respetuosa y directa, sin tecnicismos informáticos (nunca menciones "base de datos", "JSON", "Prisma", "herramientas" ni nombres de funciones).
2. Comprende términos ganaderos y contables tanto en Español como en Portugués (ej.: "frete" = "flete", "combustível" = "combustible", "abate" = "faena", "gado / boi / vaca" = "hacienda / lote", "câmara fria" = "stock en cámara", "contas a receber / quem nos deve" = "cuentas por cobrar", "contas a pagar" = "cuentas por pagar", "lucro" = "utilidad"). Nota: en el sistema las categorías y nombres están en español (ej. categoría de gasto "FLETE", "COMBUSTIBLE", etc.), así que cuando busques en las herramientas traduce el filtro al español.
3. SIEMPRE consulta las herramientas disponibles antes de dar cualquier cifra o dato del negocio. NUNCA inventes ni adivines saldos, precios, kilos ni nombres. Si algo no figura en la respuesta de la herramienta, di explícitamente: "No tengo esa información registrada en el sistema".
4. REGLA OBLIGATORIA PARA "RESUMEN GENERAL" Y "RESUMEN DE LOTES":
   - CADA VEZ que el usuario pida el Resumen General (o toque el botón "📊 Resumen General") o pida el Resumen de Lotes ("🐄 Últimos Lotes"), ADEMÁS de todos los datos generales (capital, utilidad, bancos, stock, cuentas por cobrar/pagar, cheques, distribución), DEBES INCLUIR SIEMPRE el desglose de cada lote mostrando:
     • Número de lote y proveedor
     • Valor pagado por el ganado de ese lote (\`valorPagadoPorLote\` / \`costoCompraHacienda\`)
     • Gastos del lote (\`gastosDelLote\`) y el porcentaje (%) que representan los gastos sobre el valor de compra (\`porcentajeGastosSobreCompra\` / \`porcentajeGastosSobreValorCompra\`)
   - También muestra el porcentaje global de gastos totales sobre el total de compras del período (\`porcentajeGastosTotalesSobreCompras\`).
   - Si un lote está abierto y aún no tiene cierre de compra, indica explícitamente: "Valor de compra: No registrado en el sistema (lote abierto sin cierre de compra)".
5. Si el usuario envía un audio (nota de voz), escúchalo atentamente, interpreta qué desea saber del negocio, ejecuta las herramientas necesarias y respóndele directamente sin inventar absolutamente nada.
6. Presenta los números de forma muy fácil de leer en el celular:
   - Usa Guaraníes con puntos de miles: ej. "Gs. 15.400.000".
   - Usa Kilos claros: ej. "1.250 kg".
   - Usa viñetas (•) y emojis moderados (📊, 🏦, 🥩, 💰, 🐄) para separar secciones y que la lectura sea rápida y cómoda para la vista.
7. Este bot es de SOLO LECTURA sobre las operaciones financieras/contables. Si el usuario pide registrar o borrar una venta/gasto/pago contable, explícale amablemente que por seguridad desde Telegram solo se consultan datos del ERP (pero SÍ puedes guardar notas y preferencias en tu memoria permanente).
8. Cómo funciona el negocio FFH Asociados:
   - Se compran lotes de ganado (hacienda en pie o al gancho) a Proveedores.
   - En la Faena se obtienen kilos en gancho (carne y menudencias) que entran al Inventario (Stock en Cámara). El rendimiento % es Kilos Gancho / Kilos en Pie.
   - Los lotes cerrados que aún no se faenaron ni se vendieron en pie figuran como "Stock en Pie".
   - El Capital Total Actual = Saldo en Bancos + Cheques en Cartera + Cuentas por Cobrar (clientes) + Stock en Cámara + Stock en Pie - Cuentas por Pagar (proveedores) - Retenciones de Participantes.
   - La Utilidad Bruta del Período Abierto = Capital Total Actual - Capital Inicial del Período (último cierre).
   - Participantes (ej. YL) reciben un porcentaje fijo sobre la utilidad bruta (una parte va a salario y otra a retención). El resto de la utilidad se reparte entre los Accionistas (ej. CSDF, MH) en proporción a su capital.
${customInstructions ? `\nINSTRUCCIONES ADICIONALES DEL ADMINISTRADOR:\n${customInstructions}` : ""}`;
}

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-4-argon",
];

async function callGeminiWithFallback(
  apiKey: string,
  payload: any
): Promise<any> {
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;
      const { status, data, rawText } = await ipv4PostJson(url, payload, 45000);

      if (status >= 200 && status < 300 && data?.candidates?.length) {
        return data;
      }

      lastError = new Error(`Gemini API (${model}) HTTP ${status}: ${rawText}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo conectar con los modelos de Gemini.");
}

export async function askErpGeminiAssistant(options: {
  chatId: string;
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  userName?: string;
}): Promise<string> {
  const config = await getTelegramConfig();
  if (!config.geminiApiKey) {
    return "⚠️ Falta configurar la clave `GEMINI_API_KEY`. Puedes configurarla desde el panel del ERP en **Definiciones → Bot Telegram IA** o en el archivo `.env`.";
  }

  // Cargamos tanto el historial de conversación como la memoria permanente desde PostgreSQL
  const [storedTurns, longTermMemories] = await Promise.all([
    getPersistentChatHistory(options.chatId),
    getLongTermMemory(options.chatId),
  ]);

  const systemInstruction = buildSystemInstruction(
    config.customInstructions,
    longTermMemories,
    options.userName
  );

  const userParts: any[] = [];
  if (options.audioBase64) {
    userParts.push({
      inlineData: {
        mimeType: options.audioMimeType || "audio/ogg",
        data: options.audioBase64,
      },
    });
    userParts.push({
      text:
        options.text ||
        "Escucha este mensaje de voz del usuario (puede estar en español o portugués), ten en cuenta el historial de la conversación y responde su consulta sobre el negocio FFH Asociados utilizando las herramientas del sistema.",
    });
  } else if (options.text) {
    userParts.push({ text: options.text });
  } else {
    return "Por favor envíame un mensaje de texto o una nota de voz con tu consulta.";
  }

  const contents: any[] = [
    ...storedTurns.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    { role: "user", parts: userParts },
  ];

  const allTools = [...GEMINI_TOOLS_DECLARATIONS, ...MEMORY_TOOL_DECLARATIONS];

  // Hasta 5 rondas de llamadas a herramientas (Function Calling)
  for (let round = 0; round < 5; round++) {
    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      tools: [
        {
          functionDeclarations: allTools,
        },
      ],
      generationConfig: {
        temperature: 0.0,
      },
    };

    const data = await callGeminiWithFallback(config.geminiApiKey, payload);

    const candidate = data?.candidates?.[0];
    const content = candidate?.content;
    const parts: any[] = content?.parts || [];

    if (parts.length === 0) {
      return "No pude procesar la respuesta en este momento. ¿Podrías intentar preguntarme de nuevo?";
    }

    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      const finalText = parts
        .map((p) => p.text || "")
        .join("\n")
        .trim();

      if (finalText) {
        await appendPersistentChatHistory(
          options.chatId,
          options.text || "🎤 [Consulta enviada por nota de voz]",
          finalText
        );
        return finalText;
      }
      return "Consulta procesada, pero no se generó texto de respuesta.";
    }

    // Agregamos la respuesta del modelo (que contiene los functionCall) al turno actual
    contents.push({
      role: "model",
      parts,
    });

    // Ejecutamos todas las herramientas solicitadas en paralelo
    const functionResponseParts = await Promise.all(
      functionCalls.map(async (fcPart) => {
        const fc = fcPart.functionCall;
        let toolResult: any;

        if (fc.name === "guardarEnMemoriaPermanente") {
          const memRes = await addLongTermMemory(
            options.chatId,
            String(fc.args?.recuerdo || "")
          );
          toolResult = {
            ...memRes,
            recordatorioCritico:
              "Si el usuario también pidió ver datos o recalcular un resumen en este mensaje, DEBES llamar ahora mismo a la herramienta de consulta del ERP correspondiente (ej. consultarLotesYFaenas, obtenerResumenGeneralYCapital, etc.) para obtener los datos reales de la base de datos. PROHIBIDO inventar o deducir números del historial de chat.",
          };
        } else if (fc.name === "consultarMemoriaPermanente") {
          const list = await getLongTermMemory(options.chatId);
          toolResult = { recuerdosGuardados: list };
        } else {
          toolResult = await executeErpTool(fc.name, fc.args || {});
        }

        return {
          functionResponse: {
            name: fc.name,
            response: {
              result: toolResult,
            },
          },
        };
      })
    );

    contents.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  return "He consultado varios datos del sistema pero la respuesta tomó demasiados pasos. Por favor hazme una pregunta un poco más específica.";
}
