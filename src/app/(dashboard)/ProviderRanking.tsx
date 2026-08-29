"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProviderRanking({ 
  ranking, 
  headers, 
  events 
}: { 
  ranking: any[], 
  headers: string[], 
  events: any[] 
}) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach(e => cats.add(e.category));
    return Array.from(cats).sort();
  }, [events]);

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
      <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-500" />
        Ranking de Rendimiento por Proveedor
      </h2>
      
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-semibold text-zinc-300">Proveedor</th>
              <th className="px-6 py-4 font-bold text-emerald-400 text-center">Rendimiento Global</th>
              {headers?.map(cat => (
                <th key={cat} className="px-6 py-4 font-semibold text-zinc-400 text-center">{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {ranking?.map((prov, idx) => (
              <tr 
                key={prov.name} 
                onClick={() => setSelectedProvider(prov.name)}
                className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4 font-medium text-zinc-100 flex items-center gap-3">
                  <span className="text-zinc-500 font-mono w-4">{idx + 1}.</span> 
                  <span className="group-hover:text-emerald-400 transition-colors">{prov.name}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold text-base">
                    {prov.globalRendimiento.toFixed(2)}%
                  </span>
                </td>
                {headers?.map(cat => {
                  const rend = prov.categoryRendimientos[cat];
                  return (
                    <td key={cat} className="px-6 py-4 text-center font-medium text-zinc-300">
                      {rend > 0 ? `${rend.toFixed(2)}%` : <span className="text-zinc-600">-</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {(!ranking || ranking.length === 0) && (
              <tr>
                <td colSpan={headers.length + 2} className="px-6 py-8 text-center text-zinc-500">
                  No hay datos de rendimiento disponibles.
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
                  <p className="text-xs text-zinc-400">Historial de rendimientos por lote</p>
                </div>
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <label className="text-sm text-zinc-400 block mb-2">Filtrar por categoría:</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Todos">Todas las Categorías</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                    <p className="text-center text-zinc-500 py-4">No hay registros para esta categoría.</p>
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
