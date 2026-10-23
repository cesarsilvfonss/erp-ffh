"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, TrendingUp, TrendingDown, Minus, RefreshCcw, AlertTriangle } from "lucide-react";
import { closePeriod, reopenLastClosure } from "@/actions/closure";
import { formatDatePY, startOfDayPY } from "@/lib/dates";

type ClosureSummary = { id: string; closingDate: string; periodStart: string; totalCapital: number };

export function CapitalAnalysisClient({
  data,
  closures,
  isLatestClosure,
  today,
  userRole,
}: {
  data: any;
  closures: ClosureSummary[];
  isLatestClosure: boolean;
  today: string;
  userRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  const isClosed = data.status === "CLOSED";
  const isOpen = data.status === "OPEN";
  const todayLabel = formatDatePY(startOfDayPY(today));
  const alreadyClosedToday = closures[0]?.closingDate === today;

  const periodFrom = formatDatePY(data.periodStart);
  const periodTo = isClosed ? formatDatePY(data.periodEnd) : todayLabel;

  // Variación vs capital del cierre anterior (o capital inicial)
  const prevCapital = data.previousCapital || 0;
  const variation = data.totalCapital - prevCapital;
  const variationPercent = prevCapital !== 0 ? (variation / prevCapital) * 100 : 0;

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    router.push(v ? `/operaciones/finanzas/cierre-mensual?id=${v}` : `/operaciones/finanzas/cierre-mensual`);
  }

  async function handleClose() {
    if (!confirm(`¿Cerrar definitivamente el período ${periodFrom} 00:00:00 al ${todayLabel} 23:59:59?\n\nNingún registro con fecha hasta el ${todayLabel} podrá ser alterado o ingresado. El nuevo período comenzará el día siguiente a las 00:00:00.`)) return;
    setLoading(true);
    setError("");
    const res = await closePeriod();
    setLoading(false);
    if (res.success) router.refresh();
    else setError(res.error || "Error al cerrar el período");
  }

  async function handleReopen() {
    if (!confirm(`PRECAUCIÓN: Re-abrir este período permitirá cargar y modificar registros con fecha hasta el ${periodTo}. ¿Estás seguro?`)) return;
    setLoading(true);
    setError("");
    const res = await reopenLastClosure();
    setLoading(false);
    if (res.success) router.push(`/operaciones/finanzas/cierre-mensual`);
    else setError(res.error || "Error al re-abrir el período");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Análisis sobre Capital
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Cierre de período y cuadro patrimonial (hora de Asunción)</p>
        </div>
        
        <select 
          value={isClosed ? data.id : ""}
          onChange={handleSelect}
          disabled={loading}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">PERÍODO ABIERTO (EN VIVO)</option>
          {closures.map(c => (
            <option key={c.id} value={c.id}>
              {formatDatePY(c.periodStart)} AL {formatDatePY(startOfDayPY(c.closingDate))}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Tarjeta de Estado */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
        isClosed ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      }`}>
        <div className="flex items-center gap-3">
          {isClosed ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          <div>
            <h3 className="font-bold text-lg">
              {isClosed ? "PERÍODO CERRADO Y BLOQUEADO" : "PERÍODO ABIERTO (EN VIVO)"}
            </h3>
            <p className="text-sm opacity-80">
              Del {periodFrom} 00:00:00 al {periodTo} {isClosed ? "23:59:59" : "(hoy)"}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              {isClosed
                ? `Cerrado el ${data.closedAt ? formatDatePY(data.closedAt, true) : "-"}${data.closedByName ? ` por ${data.closedByName}` : ""}. No se admiten modificaciones.`
                : alreadyClosedToday
                  ? "El día de hoy ya fue cerrado. Las operaciones nuevas deben tener fecha de mañana en adelante."
                  : "Mostrando cálculos actuales en tiempo real."}
            </p>
          </div>
        </div>
        
        {isClosed && isLatestClosure && userRole === "ADMIN" && (
          <button 
            onClick={handleReopen}
            disabled={loading}
            className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-4 py-2 rounded-lg font-medium transition-colors border border-rose-500/30 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Re-Abrir Período
          </button>
        )}

        {isOpen && !alreadyClosedToday && (
          <button 
            onClick={handleClose}
            disabled={loading}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-rose-900/20 disabled:opacity-50"
          >
            <Lock className="w-5 h-5" />
            CERRAR AL {todayLabel} 23:59:59
          </button>
        )}
      </div>

      {/* Tabla del Reporte */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-2 justify-between sm:items-center">
          <h2 className="text-xl font-bold uppercase text-zinc-100 tracking-wide">Analisis Sobre Capital</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">vs Período Anterior ({formatCurrency(prevCapital)}):</span>
            <span className={`flex items-center gap-1 font-bold ${
              variation > 0 ? "text-emerald-400" : variation < 0 ? "text-rose-400" : "text-zinc-400"
            }`}>
              {variation > 0 ? <TrendingUp className="w-4 h-4" /> : variation < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {formatCurrency(Math.abs(variation))} ({variationPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
        
        <table className="w-full text-left text-lg">
          <tbody className="divide-y divide-zinc-800/50">
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Saldo Bancario (y Cajas)</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium w-64 border-l border-zinc-800/50">
                {formatCurrency(data.bankBalance)}
              </td>
            </tr>
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Cheques en Cartera</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium border-l border-zinc-800/50">
                {data.checksBalance > 0 ? formatCurrency(data.checksBalance) : "-"}
              </td>
            </tr>
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Saldo de Clientes</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium border-l border-zinc-800/50">
                {formatCurrency(data.clientBalance)}
              </td>
            </tr>
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Saldo de Proveedores</td>
              <td className="px-6 py-4 text-right text-rose-400 font-medium border-l border-zinc-800/50">
                - {formatCurrency(data.supplierBalance)}
              </td>
            </tr>
            <tr><td colSpan={2} className="h-6"></td></tr>
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Stock (Cámara)</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium border-l border-zinc-800/50">
                {formatCurrency(data.stockValue)}
              </td>
            </tr>
            <tr className="hover:bg-zinc-800/20 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Stock (En Pie)</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium border-l border-zinc-800/50">
                {formatCurrency(data.liveStockValue || 0)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-950 border-t-2 border-zinc-700">
              <td className="px-6 py-6 font-bold text-xl uppercase text-zinc-100">
                Total Capital
              </td>
              <td className="px-6 py-6 text-right text-emerald-400 font-bold text-2xl border-l border-zinc-700">
                {formatCurrency(data.totalCapital)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
