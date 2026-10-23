"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Loader2, Pencil, Power, RefreshCcw, AlertTriangle, TrendingUp, TrendingDown, Users,
} from "lucide-react";
import { createShareholder, updateShareholder, toggleShareholderStatus } from "@/actions/shareholders";
import { formatDatePY, startOfDayPY } from "@/lib/dates";

type Shareholder = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  initialCapital: number;
  isActive: boolean;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(val);

const formatPercent = (val: number) =>
  new Intl.NumberFormat("es-PY", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val) + " %";

const inputClass =
  "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

export function ShareholdersClient({
  shareholders,
  periodStart,
  today,
  periodInitialCapital,
  currentCapital,
  netIncome,
}: {
  shareholders: Shareholder[];
  periodStart: string;
  today: string;
  periodInitialCapital: number;
  currentCapital: number;
  netIncome: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Refresco automático cada 60s para reflejar la utilidad en tiempo real.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  const active = shareholders.filter(s => s.isActive);
  const inactive = shareholders.filter(s => !s.isActive);
  const totalShareholderCapital = active.reduce((acc, s) => acc + s.initialCapital, 0);
  const difference = periodInitialCapital - totalShareholderCapital;
  const isBalanced = Math.abs(difference) < 1;

  const rows = active.map(s => {
    const share = totalShareholderCapital > 0 ? s.initialCapital / totalShareholderCapital : 0;
    const capitalization = netIncome * share;
    return { ...s, share, capitalization, expected: s.initialCapital + capitalization };
  });
  const totalCapitalization = rows.reduce((acc, r) => acc + r.capitalization, 0);

  function openNew() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(s: Shareholder) {
    setEditing(s);
    setIsFormOpen(true);
  }

  async function handleToggle(s: Shareholder) {
    const msg = s.isActive
      ? `¿Desactivar a ${s.name}? Dejará de participar en el % y en la capitalización.`
      : `¿Reactivar a ${s.name}?`;
    if (!confirm(msg)) return;
    setBusyId(s.id);
    setError("");
    const res = await toggleShareholderStatus(s.id);
    setBusyId(null);
    if (res.success) router.refresh();
    else setError(res.error || "Error al cambiar el estado");
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Accionistas
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Participación y capitalización del ejercicio — Período del {formatDatePY(periodStart)} al{" "}
            {formatDatePY(startOfDayPY(today))} (en vivo)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors border border-zinc-800"
            title="Actualizar"
          >
            <RefreshCcw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={openNew}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Accionista
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Capital Inicial del Período" value={formatCurrency(periodInitialCapital)} />
        <SummaryCard label="Capital Actual (en vivo)" value={formatCurrency(currentCapital)} />
        <SummaryCard
          label="Utilidad Neta del Ejercicio"
          value={formatCurrency(netIncome)}
          tone={netIncome > 0 ? "positive" : netIncome < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Control de cuadre */}
      {!isBalanced && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            La suma del capital inicial de los accionistas ({formatCurrency(totalShareholderCapital)}) no coincide con el
            capital inicial del período ({formatCurrency(periodInitialCapital)}). Diferencia:{" "}
            <span className="font-bold">{formatCurrency(difference)}</span>.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Accionista</th>
                <th className="px-4 py-3 text-right">% Participación</th>
                <th className="px-4 py-3 text-right">Capital Inicial</th>
                <th className="px-4 py-3 text-right">Capitalización (Utilidad)</th>
                <th className="px-4 py-3 text-right">Capital Esperado Final</th>
                <th className="px-4 py-3 text-right w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    No hay accionistas registrados. Usá &quot;Nuevo Accionista&quot; para comenzar.
                  </td>
                </tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-100">{r.name}</p>
                    {r.document && <p className="text-xs text-zinc-500">{r.document}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-cyan-400 font-medium">{formatPercent(r.share * 100)}</td>
                  <td className="px-4 py-3 text-right text-zinc-100">{formatCurrency(r.initialCapital)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${r.capitalization >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(r.capitalization)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-100 font-bold">{formatCurrency(r.expected)}</td>
                  <td className="px-4 py-3">
                    <RowActions s={r} busy={busyId === r.id} onEdit={openEdit} onToggle={handleToggle} />
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-950 border-t-2 border-zinc-700 font-bold">
                  <td className="px-4 py-4 uppercase text-zinc-100">Total</td>
                  <td className="px-4 py-4 text-right text-cyan-400">
                    {formatPercent(totalShareholderCapital > 0 ? 100 : 0)}
                  </td>
                  <td className="px-4 py-4 text-right text-zinc-100">{formatCurrency(totalShareholderCapital)}</td>
                  <td className={`px-4 py-4 text-right ${totalCapitalization >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(totalCapitalization)}
                  </td>
                  <td className="px-4 py-4 text-right text-emerald-400 text-base">
                    {formatCurrency(totalShareholderCapital + totalCapitalization)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Inactivos */}
      {inactive.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Accionistas inactivos</h3>
          <div className="divide-y divide-zinc-800/50">
            {inactive.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-zinc-400">{s.name}</span>
                  <span className="text-zinc-600 ml-3">{formatCurrency(s.initialCapital)}</span>
                </div>
                <RowActions s={s} busy={busyId === s.id} onEdit={openEdit} onToggle={handleToggle} />
              </div>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <ShareholderFormModal
          shareholder={editing}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  const color = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-zinc-100";
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-2 flex items-center gap-2 ${color}`}>
        {tone === "positive" && <TrendingUp className="w-5 h-5" />}
        {tone === "negative" && <TrendingDown className="w-5 h-5" />}
        {value}
      </p>
    </div>
  );
}

function RowActions({
  s, busy, onEdit, onToggle,
}: {
  s: Shareholder;
  busy: boolean;
  onEdit: (s: Shareholder) => void;
  onToggle: (s: Shareholder) => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => onEdit(s)}
        className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToggle(s)}
        disabled={busy}
        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
          s.isActive ? "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
        }`}
        title={s.isActive ? "Desactivar" : "Reactivar"}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ShareholderFormModal({
  shareholder, onClose, onSaved,
}: {
  shareholder: Shareholder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      document: fd.get("document") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      notes: fd.get("notes") as string,
      initialCapital: Number(fd.get("initialCapital")) || 0,
    };
    const res = shareholder ? await updateShareholder(shareholder.id, data) : await createShareholder(data);
    setIsSubmitting(false);
    if (res.success) onSaved();
    else setError(res.error || "Error al guardar");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-100">{shareholder ? "Editar Accionista" : "Nuevo Accionista"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre / Razón Social</label>
            <input name="name" type="text" required defaultValue={shareholder?.name} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">CI / RUC</label>
              <input name="document" type="text" defaultValue={shareholder?.document || ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Teléfono</label>
              <input name="phone" type="text" defaultValue={shareholder?.phone || ""} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
            <input name="email" type="email" defaultValue={shareholder?.email || ""} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Capital Inicial del Período (Gs.)</label>
            <input
              name="initialCapital"
              type="number"
              min={0}
              step="1"
              defaultValue={shareholder?.initialCapital ?? 0}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Notas</label>
            <textarea name="notes" rows={2} defaultValue={shareholder?.notes || ""} className={inputClass} />
          </div>

          <div className="pt-2 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
