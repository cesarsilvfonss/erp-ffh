"use client";

import { useState, useMemo } from "react";
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from "date-fns";
import { DollarSign, X, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function ProfitRanking({ events }: { events: any[] }) {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (dateFilter === "all") return events;
    if (!startDate || !endDate) return events;

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    return events.filter(e => {
      const d = parseISO(e.date);
      return !isBefore(d, start) && !isAfter(d, end);
    });
  }, [events, dateFilter, startDate, endDate]);

  const ranking = useMemo(() => {
    const stats: Record<string, { sumProfit: number, sumCost: number, count: number }> = {};
    
    filteredEvents.forEach(e => {
      if (!stats[e.providerName]) stats[e.providerName] = { sumProfit: 0, sumCost: 0, count: 0 };
      stats[e.providerName].sumProfit += e.netResult;
      stats[e.providerName].sumCost += e.purchaseTotal;
      stats[e.providerName].count += 1;
    });

    return Object.entries(stats)
      .map(([name, s]) => ({
        name,
        avgUtilidad: s.sumCost > 0 ? (s.sumProfit / s.sumCost) * 100 : 0,
        count: s.count
      }))
      .sort((a, b) => b.avgUtilidad - a.avgUtilidad);
  }, [filteredEvents]);

  const providerHistory = useMemo(() => {
    if (!selectedProvider) return [];
    return filteredEvents
      .filter(e => e.providerName === selectedProvider)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEvents, selectedProvider]);

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          Ranking de Rentabilidad por Proveedor
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Histórico General</option>
            <option value="custom">Rango Específico</option>
          </select>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
              />
              <span className="text-zinc-500">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto relative">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-semibold text-zinc-300">#</th>
              <th className="px-6 py-4 font-semibold text-zinc-300">Proveedor</th>
              <th className="px-6 py-4 font-semibold text-zinc-300 text-center">Lotes Evaluados</th>
              <th className="px-6 py-4 font-bold text-emerald-400 text-right">% Utilidad Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {ranking.map((prov, idx) => (
              <tr 
                key={prov.name} 
                onClick={() => setSelectedProvider(prov.name)}
                className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4 font-mono text-zinc-500">{idx + 1}</td>
                <td className="px-6 py-4 font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {prov.name}
                </td>
                <td className="px-6 py-4 text-center text-zinc-400">
                  {prov.count}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex px-2 py-1 rounded font-bold text-base ${prov.avgUtilidad >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {prov.avgUtilidad > 0 ? "+" : ""}{prov.avgUtilidad.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No hay lotes cerrados en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Historial de Lotes */}
      <AnimatePresence>
        {selectedProvider && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedProvider(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-100">{selectedProvider}</h3>
                  <p className="text-xs text-zinc-400">Rentabilidad por lote evaluado</p>
                </div>
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {providerHistory.map((h, i) => (
                    <Link key={i} href={`/operaciones/lotes/reporte?batchId=${h.batchId}`} className="block">
                      <div className="flex justify-between items-center p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/60 transition-colors group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                              Lote #{h.batchNumber}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {format(parseISO(h.date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-lg font-bold ${h.utilidadPorcentaje >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {h.utilidadPorcentaje > 0 ? "+" : ""}{h.utilidadPorcentaje.toFixed(2)}%
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {providerHistory.length === 0 && (
                    <p className="text-center text-zinc-500 py-4">No hay registros.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
