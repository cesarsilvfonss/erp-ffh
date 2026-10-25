"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  KeyRound,
  ShieldCheck,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  UserCheck,
  UserX,
  Mic,
  Sparkles,
  Globe,
  MessageSquare,
} from "lucide-react";

interface RecentChat {
  chatId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  lastMessage: string;
  lastSeenAt: string;
}

export default function TelegramBotConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [botTokenMasked, setBotTokenMasked] = useState("");
  const [geminiKeyMasked, setGeminiKeyMasked] = useState("");
  const [allowedChatIds, setAllowedChatIds] = useState<string[]>([]);
  const [manualChatId, setManualChatId] = useState("");
  const [allowAllChats, setAllowAllChats] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [webhookInput, setWebhookInput] = useState("");

  const [status, setStatus] = useState<{
    hasBotToken: boolean;
    hasGeminiKey: boolean;
    isPollingRunning: boolean;
    startedAt: string | null;
    lastError: string | null;
    botInfo: { id?: number; username?: string; firstName?: string } | null;
    webhookUrl: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estado del simulador de chat
  const [testQuestion, setTestQuestion] = useState("");
  const [testingChat, setTestingChat] = useState(false);
  const [chatLog, setChatLog] = useState<
    Array<{ role: "user" | "bot"; text: string }>
  >([
    {
      role: "bot",
      text: "👋 ¡Hola! Soy el asistente IA de FFH Asociados. Puedes probarme aquí mismo o desde Telegram (con texto o notas de voz 🎤).",
    },
  ]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telegram/admin");
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      const data = await res.json();
      setBotTokenMasked(data.config.botTokenMasked || "");
      setGeminiKeyMasked(data.config.geminiApiKeyMasked || "");
      setAllowedChatIds(data.config.allowedChatIds || []);
      setAllowAllChats(!!data.config.allowAllChats);
      setCustomInstructions(data.config.customInstructions || "");
      setRecentChats(data.config.recentChats || []);
      setStatus(data.status || null);
      if (data.status?.webhookUrl) {
        setWebhookInput(data.status.webhookUrl);
      } else if (typeof window !== "undefined") {
        setWebhookInput(`${window.location.origin}/api/telegram/webhook`);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          botToken: botToken.trim() || undefined,
          geminiApiKey: geminiApiKey.trim() || undefined,
          allowedChatIds,
          allowAllChats,
          customInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al guardar");
      }
      setBotToken("");
      setGeminiApiKey("");
      setFeedback({
        type: "success",
        text: data.startResult?.message || data.message || "Configuración guardada.",
      });
      await fetchConfig();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorizeChat = async (chatId: string) => {
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "authorize_chat", chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: data.message });
        await fetchConfig();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleRevokeChat = async (chatId: string) => {
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_chat", chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: data.message });
        await fetchConfig();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleAddManualChatId = () => {
    const clean = manualChatId.trim();
    if (!clean) return;
    setManualChatId("");
    handleAuthorizeChat(clean);
  };

  const handleTogglePolling = async (start: boolean) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: start ? "start_polling" : "stop_polling",
        }),
      });
      const data = await res.json();
      setFeedback({
        type: data.success ? "success" : "error",
        text: data.message || data.error,
      });
      await fetchConfig();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookInput.trim()) return;
    setFeedback(null);
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_webhook",
          webhookUrl: webhookInput.trim(),
        }),
      });
      const data = await res.json();
      setFeedback({
        type: data.success ? "success" : "error",
        text: data.message || data.error,
      });
      await fetchConfig();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const sendSimulatorMessage = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || testingChat) return;

    setChatLog((prev) => [...prev, { role: "user", text: q }]);
    setTestQuestion("");
    setTestingChat(true);

    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_question", question: q }),
      });
      const data = await res.json();
      setChatLog((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply || data.error || "No se obtuvo respuesta.",
        },
      ]);
    } catch (err: any) {
      setChatLog((prev) => [
        ...prev,
        { role: "bot", text: `⚠️ Error: ${err.message}` },
      ]);
    } finally {
      setTestingChat(false);
    }
  };

  const quickButtons = [
    "📊 Resumen General",
    "🏦 Saldos en Bancos",
    "🥩 Stock Cámara y Pie",
    "💰 Quién nos debe",
    "📉 A quién debemos",
    "🧾 Cheques en Cartera",
    "🐄 Últimos Lotes",
    "📈 Ventas y Gastos",
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-emerald-400" />
            Asistente IA en Telegram
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Chatbot con Inteligencia Artificial (Google Gemini) y soporte de notas de voz 🎤 para consultar todo el sistema en tiempo real.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-sm transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar Estado
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tarjeta de Estado en Vivo */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl border ${
              status?.isPollingRunning || status?.webhookUrl
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-zinc-100">
                {status?.botInfo?.username
                  ? `@${status.botInfo.username} (${status.botInfo.firstName})`
                  : "Bot de Telegram"}
              </h2>
              {status?.isPollingRunning ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ● Activo (Long Polling)
                </span>
              ) : status?.webhookUrl ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ● Activo (Webhook)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ○ Detenido / Pendiente de Token
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {status?.hasGeminiKey
                ? "✅ Motor Gemini IA conectado (soporta texto y notas de voz 🎤)"
                : "⚠️ Falta configurar la API Key de Google Gemini"}
            </p>
            {status?.lastError && (
              <p className="text-xs text-rose-400 mt-1">
                Último aviso: {status.lastError}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!status?.isPollingRunning ? (
            <button
              onClick={() => handleTogglePolling(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Iniciar Bot (Polling)
            </button>
          ) : (
            <button
              onClick={() => handleTogglePolling(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
            >
              <Square className="w-4 h-4" />
              Detener Polling
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Configuración + Autorización de Usuarios */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Credenciales */}
          <form
            onSubmit={handleSaveConfig}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center gap-2 text-zinc-100 font-semibold">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              <h3>1. Credenciales del Bot y de la IA</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Token del Bot de Telegram (creado en @BotFather)
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={
                    botTokenMasked
                      ? `Guardado (${botTokenMasked}) — escribe para reemplazar`
                      : "Ej: 7123456789:AAH..."
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  En Telegram busca <b>@BotFather</b>, envía <code>/newbot</code>, ponle un nombre (ej. <i>FFH Asistente</i>) y copia el token aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  API Key de Google Gemini (Google AI Studio)
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={
                    geminiKeyMasked
                      ? `Guardada (${geminiKeyMasked}) — escribe para reemplazar`
                      : "Ej: AIzaSy..."
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Consíguela gratis en{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline"
                  >
                    aistudio.google.com/app/apikey
                  </a>
                  . Permite que el bot entienda texto y notas de voz 🎤.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Instrucciones personalizadas para tu papá (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ej: Mi papá se llama Don Carlos, trátalo con mucho aprecio y resúmele siempre los números más importantes al principio."
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={allowAllChats}
                    onChange={(e) => setAllowAllChats(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Permitir consultas de cualquier cuenta sin requerir autorización</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </button>
              </div>
            </div>
          </form>

          {/* 2. Control de Acceso (Autorizar al papá con 1 clic) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3>2. Personas Autorizadas en Telegram</h3>
              </div>
              <span className="text-xs text-zinc-400">
                {allowAllChats
                  ? "Acceso abierto a todos"
                  : `${allowedChatIds.length} autorizado(s)`}
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Para autorizar a tu papá fácilmente: pídele que abra el bot en su Telegram y toque <b>Iniciar (/start)</b>. Su nombre aparecerá aquí abajo al instante para que lo autorices con un clic.
            </p>

            {/* Agregar Chat ID manual */}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualChatId}
                onChange={(e) => setManualChatId(e.target.value)}
                placeholder="Ingresar Chat ID manualmente (ej: 123456789)"
                className="flex-1 px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddManualChatId}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
              >
                Autorizar ID
              </button>
            </div>

            {/* Lista de usuarios que escribieron al bot */}
            <div className="space-y-2 pt-2">
              {recentChats.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                  Aún nadie ha enviado un mensaje al bot. Envía <code>/start</code> desde Telegram para aparecer aquí.
                </div>
              ) : (
                recentChats.map((chat) => {
                  const isAuth = allowedChatIds.includes(chat.chatId);
                  return (
                    <div
                      key={chat.chatId}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {chat.firstName} {chat.lastName || ""}
                          </span>
                          {chat.username && (
                            <span className="text-xs text-zinc-500">
                              @{chat.username}
                            </span>
                          )}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                            ID: {chat.chatId}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          Último mensaje: {chat.lastMessage}
                        </p>
                      </div>

                      {isAuth ? (
                        <button
                          onClick={() => handleRevokeChat(chat.chatId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium shrink-0"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Quitar Acceso
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAuthorizeChat(chat.chatId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shrink-0"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Autorizar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Opcional: Webhook para servidor en la nube */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 text-sm font-semibold">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3>Opcional: Webhook para Producción (Vercel / Cloud)</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Si el sistema corre en tu computadora o VPS, usa <b>Iniciar Bot (Polling)</b> arriba y no necesitas Webhook. Si despliegas el sistema en Vercel con dominio HTTPS público, puedes registrar el Webhook aquí:
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://tu-dominio.vercel.app/api/telegram/webhook"
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
              />
              <button
                type="button"
                onClick={handleSetWebhook}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Activar Webhook
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Simulador en Vivo del Bot */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden h-[680px]">
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Simulador con Memoria Persistente
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Recuerda la conversación y preferencias en la base de datos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/telegram/admin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clear_simulator_memory" }),
                  });
                  setChatLog([
                    {
                      role: "bot",
                      text: "🧹 Memoria del simulador reiniciada. ¿Qué deseas consultar?",
                    },
                  ]);
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 rounded-md transition-colors"
                title="Limpiar memoria del simulador"
              >
                Limpiar Memoria
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <Mic className="w-3 h-3" /> Audio
              </span>
            </div>
          </div>

          {/* Mensajes del chat */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-950 border border-zinc-800 text-zinc-200"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {testingChat && (
              <div className="flex justify-start">
                <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Consultando datos del sistema...
                </div>
              </div>
            )}
          </div>

          {/* Botones rápidos iguales a los que verá el papá en su celular */}
          <div className="p-3 bg-zinc-950/90 border-t border-zinc-800 space-y-2.5">
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Botones rápidos que verá tu papá en su celular:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickButtons.map((btn) => (
                <button
                  key={btn}
                  type="button"
                  disabled={testingChat}
                  onClick={() => sendSimulatorMessage(btn)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs text-left truncate transition-colors disabled:opacity-50"
                >
                  {btn}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendSimulatorMessage(testQuestion);
              }}
              className="flex gap-2 pt-1"
            >
              <input
                type="text"
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                disabled={testingChat}
                placeholder="Escribe cualquier pregunta sobre el sistema..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={testingChat || !testQuestion.trim()}
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
