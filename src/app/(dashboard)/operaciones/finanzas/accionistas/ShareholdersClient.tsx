"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Loader2, Pencil, Power, RefreshCcw, AlertTriangle, Users, CheckCircle2, ShieldAlert,
  History, ChevronDown, ChevronRight, ArrowRight, UserCheck, Wallet, Landmark, Lock, Unlock, CalendarDays, Eye,
} from "lucide-react";
import { createShareholder, updateShareholder, toggleShareholderStatus, payRetention } from "@/actions/shareholders";
import { formatDatePY, startOfDayPY } from "@/lib/dates";
import type { DistributionResult } from "@/lib/shareholders";
import { ShareholdersPdfButton, type ShareholdersPdfData } from "./ShareholdersPdfButton";

type Person = {
  id: string;
  type: "SHAREHOLDER" | "PARTICIPANT";
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  initialCapital: number;
  fixedProfitShare: number | null;
  capitalizationRate: number;
  isActive: boolean;
  retentionBalance: number;
};

type Movement = { id: string; shareholderId: string; date: string; type: string; amount: number; concept: string };
type LastSalary = { shareholderId: string; closingDate: string; amount: number; paid: number; status: string };
type Bank = { id: string; label: string };

type HistoryClosure = {
  id: string;
  periodStart: string;
  closingDate: string;
  periodDays: number;
  previousCapital: number;
  grossIncome: number;
  participantShare: number;
  participantSalary: number;
  totalCapital: number;
  rows: {
    name: string;
    isParticipant: boolean;
    initialCapital: number;
    participation: number;
    profitShare: number;
    profitAmount: number;
    capitalizedAmount: number;
    withdrawalAmount: number;
    finalCapital: number;
  }[];
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(val);

const formatPercent = (val: number, digits = 2) =>
  new Intl.NumberFormat("es-PY", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(val) + " %";

const inputClass =
  "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

const moneyTone = (v: number) => (v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-zinc-400");

const MOVEMENT_LABEL: Record<string, string> = {
  INITIAL: "Saldo inicial",
  CLOSURE: "Retención de cierre",
  PAYMENT: "Pago",
  ADJUSTMENT: "Ajuste",
};

export function ShareholdersClient({
  mode,
  selectedClosureId,
  closureOptions,
  people,
  periodStart,
  periodEnd,
  periodDays,
  today,
  periodInitialCapital,
  currentCapital,
  distribution: d,
  capitalCheck,
  banks,
  movements,
  lastSalaries,
  history,
}: {
  mode: "LIVE" | "CLOSED";
  selectedClosureId: string | null;
  closureOptions: { id: string; periodStart: string; closingDate: string }[];
  people: Person[];
  periodStart: string;
  periodEnd: string;
  periodDays: number;
  today: string;
  periodInitialCapital: number;
  currentCapital: number;
  distribution: DistributionResult;
  capitalCheck: { difference: number; isBalanced: boolean };
  banks: Bank[];
  movements: Movement[];
  lastSalaries: LastSalary[];
  history: HistoryClosure[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Person | null>(null);
  const [newType, setNewType] = useState<Person["type"] | null>(null);
  const [payingRetention, setPayingRetention] = useState<Person | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const isLive = mode === "LIVE";

  // Refresco automático cada 60s para reflejar la utilidad en tiempo real (solo período abierto).
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router, isLive]);

  const byId = new Map(people.map(p => [p.id, p]));
  const inactive = isLive ? people.filter(p => !p.isActive) : [];
  const U = d.grossIncome;
  const periodFromLabel = formatDatePY(periodStart);
  const periodToLabel = formatDatePY(periodEnd);

  // Crecimiento del capital de cada accionista
  const growthOf = (profit: number, initial: number) => (initial > 0 ? (profit / initial) * 100 : 0);
  const monthlyOf = (growth: number) => (growth / periodDays) * 30;
  const totalGrowth = growthOf(d.shareholdersIncome, d.totalInitialCapital);

  function handleSelectPeriod(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    router.push(v ? `/operaciones/finanzas/accionistas?id=${v}` : `/operaciones/finanzas/accionistas`);
  }

  const pdfData: ShareholdersPdfData = {
    mode,
    periodFromLabel,
    periodToLabel,
    periodDays,
    periodInitialCapital,
    currentCapital,
    distribution: d,
    capitalBalanced: capitalCheck.isBalanced,
    capitalDifference: capitalCheck.difference,
    retentionMovements: movements
      .filter(m => d.participants.some(p => p.id === m.shareholderId))
      .map(m => ({
        participant: byId.get(m.shareholderId)?.name || "",
        date: formatDatePY(m.date),
        type: MOVEMENT_LABEL[m.type] || m.type,
        concept: m.concept,
        amount: m.amount,
      })),
  };

  async function handleToggle(p: Person) {
    const msg = p.isActive
      ? `¿Desactivar a ${p.name}? Dejará de participar en la distribución${p.type === "SHAREHOLDER" ? " y en el control de capital" : ""}.`
      : `¿Reactivar a ${p.name}?`;
    if (!confirm(msg)) return;
    setBusyId(p.id);
    setError("");
    const res = await toggleShareholderStatus(p.id);
    setBusyId(null);
    if (res.success) router.refresh();
    else setError(res.error || "Error al cambiar el estado");
  }

  const formOpen = !!editing || !!newType;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Accionistas
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Distribución de la utilidad del período</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedClosureId || ""}
            onChange={handleSelectPeriod}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">PERÍODO ABIERTO (EN VIVO)</option>
            {closureOptions.map(c => (
              <option key={c.id} value={c.id}>
                CERRADO: {formatDatePY(c.periodStart)} AL {formatDatePY(startOfDayPY(c.closingDate))}
              </option>
            ))}
          </select>
          <ShareholdersPdfButton data={pdfData} />
          {isLive && (
            <>
              <button
                onClick={() => router.refresh()}
                className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors border border-zinc-800"
              >
                <RefreshCcw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={() => setNewType("PARTICIPANT")}
                className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Plus className="w-4 h-4" />
                Participante
              </button>
              <button
                onClick={() => setNewType("SHAREHOLDER")}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Accionista
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estado y duración del período */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-3 sm:items-center justify-between ${
        isLive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      }`}>
        <div className="flex items-center gap-3">
          {isLive ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          <div>
            <p className="font-bold">{isLive ? "PERÍODO ABIERTO (EN VIVO)" : "PERÍODO CERRADO"}</p>
            <p className="text-sm opacity-80">
              Del {periodFromLabel} al {periodToLabel}{isLive ? " (hoy)" : ""}
              {isLive ? " — valores estimados en tiempo real" : " — valores liquidados al cierre"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-100">
          <CalendarDays className="w-5 h-5 opacity-80" />
          <span className="text-sm text-zinc-400">Duración del período:</span>
          <span className="text-xl font-bold">{periodDays} {periodDays === 1 ? "día" : "días"}</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {d.errors.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{d.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* ===== BLOQUE 1: Cascada de la utilidad ===== */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold uppercase text-zinc-100 tracking-wide">1. Utilidad del Período</h2>
          <p className="text-xs text-zinc-500 mt-1">{isLive ? "Cálculo en tiempo real. Al cerrar el período se liquida con estos mismos valores." : "Valores liquidados en el cierre del período."}</p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-zinc-800/50">
            <CascadeRow label={isLive ? "Capital actual (en vivo)" : "Capital al cierre antes de participaciones"} hint="Neto de proveedores y retenciones" value={formatCurrency(currentCapital)} />
            <CascadeRow label="(−) Capital inicial del período" hint="Capital del cierre anterior" value={`− ${formatCurrency(periodInitialCapital)}`} />
            <CascadeRow strong label="= UTILIDAD BRUTA DEL PERÍODO" value={formatCurrency(U)} valueClass={moneyTone(U)} />
            {d.participants.map(p => (
              <CascadeRow
                key={p.id}
                label={`(−) Participación ${p.name} ${formatPercent(p.profitShare)}`}
                hint={U > 0
                  ? `Salario ${formatPercent(100 - p.retentionRate, 0)}: ${formatCurrency(p.salary)} · Retención ${formatPercent(p.retentionRate, 0)}: ${formatCurrency(p.retained)}`
                  : "Sin utilidad: no corresponde participación"}
                value={`− ${formatCurrency(p.amount)}`}
                valueClass="text-cyan-400"
              />
            ))}
            <CascadeRow
              strong
              highlight
              label={`= UTILIDAD PARA ACCIONISTAS (${formatPercent(d.shareholdersPercent)})`}
              hint={U < 0 ? "Pérdida: la absorben 100% los accionistas según su capital" : undefined}
              value={formatCurrency(d.shareholdersIncome)}
              valueClass={moneyTone(d.shareholdersIncome)}
            />
          </tbody>
        </table>
      </div>

      {/* ===== BLOQUE 2: Liquidación de participantes ===== */}
      {d.participants.map(row => {
        const p = byId.get(row.id)!;
        const last = lastSalaries.find(s => s.shareholderId === row.id);
        const myMovements = movements.filter(m => m.shareholderId === row.id);
        return (
          <div key={row.id} className="bg-zinc-900/50 border border-cyan-500/20 rounded-xl overflow-hidden">
            <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  2. Liquidación {row.name}
                  <span className="text-xs font-semibold normal-case px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Participante (no accionista)</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatPercent(row.profitShare)} de la utilidad bruta · {formatPercent(100 - row.retentionRate, 0)} salario · {formatPercent(row.retentionRate, 0)} retenido
                </p>
              </div>
              {isLive && <RowActions p={p} busy={busyId === p.id} onEdit={setEditing} onToggle={handleToggle} />}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <InfoBox label={`Participación ${formatPercent(row.profitShare)}`} value={formatCurrency(row.amount)} tone="text-cyan-400" />
              <InfoBox
                label={`Salario ${formatPercent(100 - row.retentionRate, 0)}`}
                value={formatCurrency(row.salary)}
                tone="text-amber-400"
                hint={isLive ? `Se genera al cerrar: gasto "SUELDOS Y BONIFICACIONES" con fecha del día de cierre` : `Gasto "SUELDOS Y BONIFICACIONES" del día de cierre`}
              />
              <InfoBox
                label={`Retención ${formatPercent(row.retentionRate, 0)}`}
                value={formatCurrency(row.retained)}
                tone="text-zinc-100"
                hint={isLive ? "Se suma a su saldo al cerrar" : "Sumada a su saldo en el cierre"}
              />
              <InfoBox
                label={isLive ? "Saldo de retención acumulado" : "Retención al inicio del período"}
                value={formatCurrency(row.retentionBefore)}
                tone="text-zinc-100"
                hint={`${isLive ? "Después del cierre" : "Al cierre"}: ${formatCurrency(row.retentionAfter)}`}
              />
            </div>

            <div className="px-6 pb-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
              <div className="text-xs text-zinc-400">
                {last ? (
                  <span>
                    Salario {isLive ? "del último cierre" : "de este cierre"} ({formatDatePY(startOfDayPY(last.closingDate))}): <span className="font-semibold text-zinc-200">{formatCurrency(last.amount)}</span> —{" "}
                    {last.status === "PAID" ? (
                      <span className="text-emerald-400 font-semibold">PAGADO</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">
                        PENDIENTE {last.paid > 0 ? `(pagado ${formatCurrency(last.paid)})` : ""} — pagalo desde Cuentas por Pagar
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Aún no hay salarios liquidados.</span>
                )}
              </div>
              {isLive && <button
                onClick={() => setPayingRetention(p)}
                disabled={row.retentionBefore <= 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
              >
                <Wallet className="w-4 h-4" />
                Pagar Retención
              </button>}
            </div>

            <div className="border-t border-zinc-800 px-6 py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Movimientos de la retención{isLive ? "" : ` (hasta el ${periodToLabel})`}</p>
              {myMovements.length === 0 ? (
                <p className="text-xs text-zinc-600">Sin movimientos.</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-zinc-800/50">
                    {myMovements.map(m => (
                      <tr key={m.id}>
                        <td className="py-1.5 text-zinc-500 w-24">{formatDatePY(m.date)}</td>
                        <td className="py-1.5 text-zinc-400 w-40">{MOVEMENT_LABEL[m.type] || m.type}</td>
                        <td className="py-1.5 text-zinc-500">{m.concept}</td>
                        <td className={`py-1.5 text-right font-medium ${m.amount >= 0 ? "text-zinc-200" : "text-emerald-400"}`}>
                          {m.amount >= 0 ? "+" : "−"} {formatCurrency(Math.abs(m.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}

      {/* ===== BLOQUE 3: Accionistas ===== */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold uppercase text-zinc-100 tracking-wide">3. Capital por Accionista</h2>
          <p className="text-xs text-zinc-500 mt-1">
            La utilidad para accionistas ({formatCurrency(d.shareholdersIncome)}) se reparte proporcionalmente al capital y se capitaliza 100%.
          </p>
        </div>

        <div className="px-6 pt-4">
          {capitalCheck.isBalanced ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p>
                <span className="font-bold">Control de capital OK:</span> suma de accionistas {formatCurrency(d.totalInitialCapital)} = capital del último cierre{" "}
                {formatCurrency(periodInitialCapital)}.
              </p>
            </div>
          ) : (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p>
                <span className="font-bold">CIERRE BLOQUEADO:</span> suma de accionistas {formatCurrency(d.totalInitialCapital)} ≠ capital del último cierre{" "}
                {formatCurrency(periodInitialCapital)}. Diferencia: <span className="font-bold">{formatCurrency(capitalCheck.difference)}</span>.
              </p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Accionista</th>
                <th className="px-4 py-3 text-right">% Capital</th>
                <th className="px-4 py-3 text-right">Capital Inicial</th>
                <th className="px-4 py-3 text-right">% Utilidad Bruta</th>
                <th className="px-4 py-3 text-right">Capitalización</th>
                <th className="px-4 py-3 text-right">{isLive ? "Capital Esperado Final" : "Capital Final"}</th>
                <th className="px-4 py-3 text-right">% Crecimiento</th>
                <th className="px-4 py-3 text-right" title={`% Crecimiento / ${periodDays} días × 30`}>% Crec. Mensual</th>
                {isLive && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {d.shareholders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">No hay accionistas registrados.</td>
                </tr>
              )}
              {d.shareholders.map(r => {
                const p = byId.get(r.id)!;
                const g = growthOf(r.profitAmount, r.initialCapital);
                return (
                  <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-100">{r.name}</p>
                      {p.document && <p className="text-xs text-zinc-500">{p.document}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{formatPercent(r.participation, 4)}</td>
                    <td className="px-4 py-3 text-right text-zinc-100">{formatCurrency(r.initialCapital)}</td>
                    <td className="px-4 py-3 text-right text-cyan-400">{formatPercent(r.profitShare, 4)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${moneyTone(r.profitAmount)}`}>{formatCurrency(r.profitAmount)}</td>
                    <td className="px-4 py-3 text-right text-zinc-100 font-bold">{formatCurrency(r.finalCapital)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${moneyTone(g)}`}>{formatPercent(g)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${moneyTone(g)}`}>{formatPercent(monthlyOf(g))}</td>
                    {isLive && (
                      <td className="px-4 py-3">
                        <RowActions p={p} busy={busyId === p.id} onEdit={setEditing} onToggle={handleToggle} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {d.shareholders.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-950 border-t-2 border-zinc-700 font-bold">
                  <td className="px-4 py-4 uppercase text-zinc-100">Total</td>
                  <td className="px-4 py-4 text-right text-zinc-300">{formatPercent(100, 4)}</td>
                  <td className="px-4 py-4 text-right text-zinc-100">{formatCurrency(d.totalInitialCapital)}</td>
                  <td className="px-4 py-4 text-right text-cyan-400">{formatPercent(d.shareholders.reduce((a, r) => a + r.profitShare, 0), 4)}</td>
                  <td className={`px-4 py-4 text-right ${moneyTone(d.shareholdersIncome)}`}>{formatCurrency(d.shareholdersIncome)}</td>
                  <td className="px-4 py-4 text-right text-emerald-400 text-base">{formatCurrency(d.totalFinalCapital)}</td>
                  <td className={`px-4 py-4 text-right ${moneyTone(totalGrowth)}`}>{formatPercent(totalGrowth)}</td>
                  <td className={`px-4 py-4 text-right ${moneyTone(totalGrowth)}`}>{formatPercent(monthlyOf(totalGrowth))}</td>
                  {isLive && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="px-6 py-3 text-xs text-zinc-500 border-t border-zinc-800">
          Capital del cierre = capital {isLive ? "actual" : "antes de participaciones"} {formatCurrency(currentCapital)} − participación {formatCurrency(d.participantsTotal)} ={" "}
          <span className="font-semibold text-zinc-300">{formatCurrency(currentCapital - d.participantsTotal)}</span> = suma de capitales finales{" "}
          {formatCurrency(d.totalFinalCapital)}. El período siguiente arranca con utilidad 0.
          <br />
          % Crecimiento = Capitalización / Capital Inicial. % Crec. Mensual = % Crecimiento / {periodDays} días del período × 30.
        </p>
      </div>

      {/* Inactivos */}
      {inactive.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Inactivos</h3>
          <div className="divide-y divide-zinc-800/50">
            {inactive.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-zinc-400">{p.name}</span>
                  <span className="text-zinc-600 ml-3">{p.type === "PARTICIPANT" ? "Participante" : formatCurrency(p.initialCapital)}</span>
                </div>
                <RowActions p={p} busy={busyId === p.id} onEdit={setEditing} onToggle={handleToggle} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== BLOQUE 4: Historial ===== */}
      <HistorySection history={history} selectedId={selectedClosureId} />

      {formOpen && (
        <PersonFormModal
          person={editing}
          type={editing?.type || newType || "SHAREHOLDER"}
          onClose={() => {
            setEditing(null);
            setNewType(null);
          }}
          onSaved={() => {
            setEditing(null);
            setNewType(null);
            router.refresh();
          }}
        />
      )}

      {payingRetention && (
        <PayRetentionModal
          person={payingRetention}
          banks={banks}
          today={today}
          onClose={() => setPayingRetention(null)}
          onSaved={() => {
            setPayingRetention(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CascadeRow({
  label, value, hint, strong, highlight, valueClass = "text-zinc-100",
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <tr className={highlight ? "bg-zinc-950" : ""}>
      <td className="px-6 py-3">
        <p className={strong ? "font-bold text-zinc-100 uppercase" : "text-zinc-300"}>{label}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </td>
      <td className={`px-6 py-3 text-right w-64 border-l border-zinc-800/50 ${strong ? "font-bold text-lg" : "font-medium"} ${valueClass}`}>{value}</td>
    </tr>
  );
}

function InfoBox({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className={`font-bold text-lg ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function HistorySection({ history, selectedId }: { history: HistoryClosure[]; selectedId: string | null }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(selectedId ?? history[0]?.id ?? null);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
        <History className="w-5 h-5 text-zinc-400" />
        <h2 className="text-lg font-bold uppercase text-zinc-100 tracking-wide">4. Historial de Evolución del Capital</h2>
      </div>
      {history.length === 0 ? (
        <p className="px-6 py-8 text-center text-zinc-500 text-sm">Todavía no hay cierres con distribución.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {history.map(c => {
            const isOpen = openId === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : c.id)}
                  className="w-full px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2 hover:bg-zinc-800/20 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 font-semibold text-zinc-200">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {formatDatePY(c.periodStart)} al {formatDatePY(startOfDayPY(c.closingDate))}
                    <span className="text-xs font-normal text-zinc-500">({c.periodDays} días)</span>
                    {selectedId === c.id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">VIENDO</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>{formatCurrency(c.previousCapital)}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-zinc-200 font-semibold">{formatCurrency(c.totalCapital)}</span>
                    <span>Utilidad bruta: <span className={moneyTone(c.grossIncome)}>{formatCurrency(c.grossIncome)}</span></span>
                    <span>Participación: <span className="text-cyan-400">{formatCurrency(c.participantShare)}</span></span>
                    {selectedId !== c.id && (
                      <span
                        role="link"
                        onClick={e => {
                          e.stopPropagation();
                          router.push(`/operaciones/finanzas/accionistas?id=${c.id}`);
                        }}
                        className="flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Ver formulario
                      </span>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto px-6 pb-4">
                    {c.rows.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-2">Cierre realizado antes de registrar accionistas.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="text-zinc-500 uppercase">
                          <tr>
                            <th className="py-2">Nombre</th>
                            <th className="py-2 text-right">% Utilidad</th>
                            <th className="py-2 text-right">Inicial</th>
                            <th className="py-2 text-right">Asignado</th>
                            <th className="py-2 text-right">Capitalizado / Retenido</th>
                            <th className="py-2 text-right">Salario</th>
                            <th className="py-2 text-right">Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {c.rows.map(r => (
                            <tr key={r.name}>
                              <td className="py-2 text-zinc-200 font-medium">
                                {r.name}
                                <span className="ml-2 text-[10px] text-zinc-500">{r.isParticipant ? "PARTICIPANTE (retención)" : `ACCIONISTA ${formatPercent(r.participation, 2)}`}</span>
                              </td>
                              <td className="py-2 text-right text-cyan-400">{formatPercent(r.profitShare, 4)}</td>
                              <td className="py-2 text-right text-zinc-300">{formatCurrency(r.initialCapital)}</td>
                              <td className={`py-2 text-right ${moneyTone(r.profitAmount)}`}>{formatCurrency(r.profitAmount)}</td>
                              <td className={`py-2 text-right ${moneyTone(r.capitalizedAmount)}`}>{formatCurrency(r.capitalizedAmount)}</td>
                              <td className="py-2 text-right text-amber-400">{r.withdrawalAmount > 0 ? formatCurrency(r.withdrawalAmount) : "-"}</td>
                              <td className="py-2 text-right text-zinc-100 font-bold">{formatCurrency(r.finalCapital)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowActions({
  p, busy, onEdit, onToggle,
}: {
  p: Person;
  busy: boolean;
  onEdit: (p: Person) => void;
  onToggle: (p: Person) => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => onEdit(p)}
        className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToggle(p)}
        disabled={busy}
        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
          p.isActive ? "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
        }`}
        title={p.isActive ? "Desactivar" : "Reactivar"}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormButtons({ onClose, isSubmitting, label = "Guardar" }: { onClose: () => void; isSubmitting: boolean; label?: string }) {
  return (
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
        {label}
      </button>
    </div>
  );
}

function PersonFormModal({
  person, type, onClose, onSaved,
}: {
  person: Person | null;
  type: Person["type"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isParticipant = type === "PARTICIPANT";
  const dec = (v: FormDataEntryValue | null) => ((v as string) || "").trim().replace(",", ".");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      type,
      name: fd.get("name") as string,
      document: fd.get("document") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      notes: fd.get("notes") as string,
      initialCapital: Number(fd.get("initialCapital")) || 0,
      fixedProfitShare: isParticipant ? Number(dec(fd.get("fixedProfitShare"))) : null,
      capitalizationRate: isParticipant ? Number(dec(fd.get("capitalizationRate")) || "0") : 100,
      initialRetention: Number(fd.get("initialRetention")) || 0,
    };
    const res = person ? await updateShareholder(person.id, data) : await createShareholder(data);
    setIsSubmitting(false);
    if (res.success) onSaved();
    else setError(res.error || "Error al guardar");
  }

  const title = `${person ? "Editar" : "Nuevo"} ${isParticipant ? "Participante" : "Accionista"}`;

  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre / Razón Social</label>
          <input name="name" type="text" required defaultValue={person?.name} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">CI / RUC</label>
            <input name="document" type="text" defaultValue={person?.document || ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Teléfono</label>
            <input name="phone" type="text" defaultValue={person?.phone || ""} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
          <input name="email" type="email" defaultValue={person?.email || ""} className={inputClass} />
        </div>

        {isParticipant ? (
          <div className="border border-cyan-500/20 rounded-xl p-4 space-y-4 bg-cyan-500/5">
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Participación en utilidades</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">% sobre la utilidad bruta</label>
                <input
                  name="fixedProfitShare"
                  type="text"
                  inputMode="decimal"
                  required
                  defaultValue={person?.fixedProfitShare ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">% retenido</label>
                <input name="capitalizationRate" type="text" inputMode="decimal" defaultValue={person?.capitalizationRate ?? 10} className={inputClass} />
              </div>
            </div>
            {!person && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Retención inicial acumulada (Gs.)</label>
                <input name="initialRetention" type="number" min={0} step="1" defaultValue={0} className={inputClass} />
              </div>
            )}
            <p className="text-xs text-zinc-500">
              No es accionista. Solo cobra si hay utilidad. La parte no retenida es salario (gasto al cierre); la retenida es una deuda de la empresa con él.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Capital Inicial del Período (Gs.)</label>
            <input name="initialCapital" type="number" min={0} step="1" defaultValue={person?.initialCapital ?? 0} className={inputClass} />
            <p className="text-xs text-zinc-600 mt-1">La suma de los accionistas debe coincidir con el capital del último cierre.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Notas</label>
          <textarea name="notes" rows={2} defaultValue={person?.notes || ""} className={inputClass} />
        </div>

        <FormButtons onClose={onClose} isSubmitting={isSubmitting} />
      </form>
    </ModalShell>
  );
}

function PayRetentionModal({
  person, banks, today, onClose, onSaved,
}: {
  person: Person;
  banks: Bank[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount")) || 0;
    if (!confirm(`¿Registrar el pago de ${formatCurrency(amount)} de la retención de ${person.name}?`)) return;
    setIsSubmitting(true);
    setError("");
    const res = await payRetention({
      shareholderId: person.id,
      bankAccountId: fd.get("bankAccountId") as string,
      date: fd.get("date") as string,
      amount,
      reference: fd.get("reference") as string,
    });
    setIsSubmitting(false);
    if (res.success) onSaved();
    else setError(res.error || "Error al registrar el pago");
  }

  return (
    <ModalShell title={`Pagar Retención — ${person.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm flex justify-between">
          <span className="text-zinc-400">Saldo de retención</span>
          <span className="font-bold text-zinc-100">{formatCurrency(person.retentionBalance)}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
            <Landmark className="w-4 h-4" /> Banco / Caja
          </label>
          <select name="bankAccountId" required className={inputClass}>
            <option value="">Seleccionar...</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Fecha</label>
            <input name="date" type="date" required defaultValue={today} max={today} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Monto (Gs.)</label>
            <input
              name="amount"
              type="number"
              required
              min={1}
              max={Math.round(person.retentionBalance)}
              step="1"
              defaultValue={Math.round(person.retentionBalance)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Referencia</label>
          <input name="reference" type="text" placeholder="Nro. transferencia, recibo..." className={inputClass} />
        </div>
        <p className="text-xs text-zinc-500">Sale del banco y baja la deuda de retención. El capital no cambia.</p>
        <FormButtons onClose={onClose} isSubmitting={isSubmitting} label="Registrar Pago" />
      </form>
    </ModalShell>
  );
}
