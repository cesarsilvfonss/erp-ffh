"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProviderRanking({ events }: { events: any[] }) {
  const categories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach(e => cats.add(e.category));
    return Array.from(cats).sort();
  }, [events]);

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const vacaCat = events.find(e => e.category.toUpperCase() === "VACA");
    return vacaCat ? vacaCat.category : "Todos";
  });
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const ranking = useMemo(() => {
    const filtered = selectedCategory === "Todos" 
      ? events 
      : events.filter(e => e.category === selectedCategory);

    const providerStats: Record<string, { sumCarcass: number, sumLive: number, count: number }> = {};
    
    filtered.forEach(e => {
      if (!providerStats[e.providerName]) providerStats[e.providerName] = { sumCarcass: 0, sumLive: 0, count: 0 };
      providerStats[e.providerName].sumCarcass += e.carcass;
      providerStats[e.providerName].sumLive += e.live;
      providerStats[e.providerName].count += 1;
    });

    return Object.entries(providerStats)
      .map(([name, stats]) => ({
        name,
        avgRendimiento: stats.sumLive > 0 ? (stats.sumCarcass / stats.sumLive) * 100 : 0,
        count: stats.count
      }))
      .sort((a, b) => b.avgRendimiento - a.avgRendimiento);
  }, [events, selectedCategory]);

  const providerHistory = useMemo(() => {
    if (!selectedProvider) return [];
    let filtered = events.filter(e => e.providerName === selectedProvider);
    if (selectedCategory !== "Todos") {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }
    // Sort desc by date
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, selectedProvider, selectedCategory]);

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Ranking de Rendimiento por Proveedor
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Filtrar Categoría:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="Todos">Todas las Categorías (Global)</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto relative">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-semibold text-zinc-300">#</th>
              <th className="px-6 py-4 font-semibold text-zinc-300">Proveedor</th>
              <th className="px-6 py-4 font-semibold text-zinc-300 text-center">Lotes Evaluados</th>
              <th className="px-6 py-4 font-bold text-emerald-400 text-right">Rendimiento Promedio</th>
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
                  <span className="inline-flex px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold text-base">
                    {prov.avgRendimiento.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No hay datos de rendimiento para esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal/Cartón de Historial */}
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-zinc-100">{selectedProvider}</h3>
                  <p className="text-xs text-zinc-400">
                    Historial de rendimientos {selectedCategory !== "Todos" ? `(${selectedCategory})` : "(Global)"}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                <div className="space-y-3">
                  {providerHistory.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                            Lote #{h.batchNumber}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {format(new Date(h.date), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-zinc-200">{h.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-400">{h.rendimiento.toFixed(2)}%</span>
                      </div>
                    </div>
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
