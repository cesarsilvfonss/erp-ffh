"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, TrendingUp, TrendingDown, Minus, Save, RefreshCcw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createOrUpdateClosure, reopenClosure } from "@/actions/closure";

export function CapitalAnalysisClient({
  data,
  prevData,
  selectedMonth,
  selectedYear,
  userRole,
  userId
}: {
  data: any;
  prevData: any;
  selectedMonth: number;
  selectedYear: number;
  userRole: string;
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>, type: 'month' | 'year') {
    const val = parseInt(e.target.value);
    const m = type === 'month' ? val : selectedMonth;
    const y = type === 'year' ? val : selectedYear;
    router.push(`/operaciones/finanzas/cierre-mensual?month=${m}&year=${y}`);
  }

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - i);

  const isClosed = data.status === "CLOSED";
  const isDraft = data.status === "DRAFT";
  const isOpen = data.status === "OPEN";

  // Calcular Variación
  let variation = 0;
  let variationPercent = 0;
  if (prevData) {
    variation = data.totalCapital - prevData.totalCapital;
    if (prevData.totalCapital !== 0) {
      variationPercent = (variation / prevData.totalCapital) * 100;
    }
  }

  async function handleCloseMonth() {
    if (!confirm(`¿Estás seguro de cerrar definitivamente ${months[selectedMonth]} ${selectedYear}? Ningún registro podrá ser alterado o ingresado para este período.`)) return;
    
    setLoading(true);
    setError("");
    const res = await createOrUpdateClosure(selectedYear, selectedMonth, true, userId);
    setLoading(false);
    
    if (res.success) {
      router.refresh();
    } else {
      setError("Error al cerrar el mes");
    }
  }

  async function handleReopenMonth() {
    if (!confirm(`PRECAUCIÓN: Re-abrir este mes permitirá cargar y modificar registros. Esto alterará el reporte de stock retrospectivo. ¿Estás seguro?`)) return;
    
    setLoading(true);
    setError("");
    const res = await reopenClosure(selectedYear, selectedMonth, userId);
    setLoading(false);
    
    if (res.success) {
      router.refresh();
    } else {
      setError("Error al re-abrir el mes");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Análisis sobre Capital
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Cierre mensual y cuadro patrimonial</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth}
            onChange={(e) => handleFilterChange(e, 'month')}
            disabled={loading}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => handleFilterChange(e, 'year')}
            disabled={loading}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Tarjeta de Estado */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isClosed ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : 
        isDraft ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      }`}>
        <div className="flex items-center gap-3">
          {isClosed ? <Lock className="w-6 h-6" /> : isDraft ? <Save className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          <div>
            <h3 className="font-bold text-lg">
              {isClosed ? "MES CERRADO Y BLOQUEADO" : isDraft ? "BORRADOR AUTOMÁTICO (ABIERTO)" : "MES ABIERTO (EN VIVO)"}
            </h3>
            <p className="text-sm opacity-80">
              {isClosed ? `Congelado el ${format(new Date(data.closedAt), "dd/MM/yyyy HH:mm")}. No se admiten modificaciones.` : 
               isDraft ? "Fotografía tomada automáticamente a fin de mes. Aún puedes cargar registros." : 
               "Mostrando cálculos actuales en tiempo real."}
            </p>
          </div>
        </div>
        
        {isClosed && userRole === "ADMIN" && (
          <button 
            onClick={handleReopenMonth}
            disabled={loading}
            className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-4 py-2 rounded-lg font-medium transition-colors border border-rose-500/30 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Re-Abrir Mes
          </button>
        )}

        {(isOpen || isDraft) && (
          <button 
            onClick={handleCloseMonth}
            disabled={loading}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-rose-900/20 disabled:opacity-50"
          >
            <Lock className="w-5 h-5" />
            CERRAR MES DEFINITIVAMENTE
          </button>
        )}
      </div>

      {/* Tabla del Reporte */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase text-zinc-100 tracking-wide">Analisis Sobre Capital</h2>
          {prevData && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">vs Mes Anterior:</span>
              <span className={`flex items-center gap-1 font-bold ${
                variation > 0 ? "text-emerald-400" : variation < 0 ? "text-rose-400" : "text-zinc-400"
              }`}>
                {variation > 0 ? <TrendingUp className="w-4 h-4" /> : variation < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {formatCurrency(Math.abs(variation))} ({variationPercent.toFixed(1)}%)
              </span>
            </div>
          )}
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
              <td className="px-6 py-4 font-semibold text-zinc-300 uppercase">Stock</td>
              <td className="px-6 py-4 text-right text-zinc-100 font-medium border-l border-zinc-800/50">
                {formatCurrency(data.stockValue)}
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
