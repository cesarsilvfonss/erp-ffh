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
    const providerStats: Record<string, { 
      globalSum: number, 
      globalCount: number, 
      cats: Record<string, { sum: number, count: number }> 
    }> = {};

    events.forEach(e => {
      if (!providerStats[e.providerName]) {
        providerStats[e.providerName] = { globalSum: 0, globalCount: 0, cats: {} };
      }
      const p = providerStats[e.providerName];
      p.globalSum += e.rendimiento;
      p.globalCount += 1;

      if (!p.cats[e.category]) p.cats[e.category] = { sum: 0, count: 0 };
      p.cats[e.category].sum += e.rendimiento;
      p.cats[e.category].count += 1;
    });

    return Object.entries(providerStats)
      .map(([name, stats]) => {
        const catAverages: Record<string, number> = {};
        categories.forEach(c => {
          if (stats.cats[c] && stats.cats[c].count > 0) {
            catAverages[c] = stats.cats[c].sum / stats.cats[c].count;
          } else {
            catAverages[c] = 0;
          }
        });

        return {
          name,
          globalAvg: stats.globalCount > 0 ? stats.globalSum / stats.globalCount : 0,
          catAverages,
          globalCount: stats.globalCount
        };
      })
      .filter(p => {
        if (selectedCategory === "Todos") return p.globalAvg > 0;
        return p.catAverages[selectedCategory] > 0;
      })
      .sort((a, b) => {
        if (selectedCategory === "Todos") {
          return b.globalAvg - a.globalAvg;
        } else {
          return b.catAverages[selectedCategory] - a.catAverages[selectedCategory];
        }
      });
  }, [events, selectedCategory, categories]);

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
        <h2 className="text-lg font-bold text-zinc-100">Ranking de Rendimiento por Proveedor</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Categoría Principal:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="Todos">Global (Todas)</option>
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
              <th className={`px-6 py-4 text-center ${selectedCategory === "Todos" ? "font-bold text-emerald-400" : "font-semibold text-zinc-300"}`}>Global</th>
              {categories.map(c => (
                <th key={c} className={`px-6 py-4 text-center ${selectedCategory === c ? "font-bold text-emerald-400" : "font-semibold text-zinc-400"}`}>{c}</th>
              ))}
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
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded font-bold text-base ${selectedCategory === "Todos" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-300"}`}>
                    {prov.globalAvg.toFixed(2)}%
                  </span>
                </td>
                {categories.map(c => {
                  const rend = prov.catAverages[c];
                  const isSelected = selectedCategory === c;
                  return (
                    <td key={c} className="px-6 py-4 text-center font-medium">
                      {rend > 0 ? (
                        <span className={`inline-flex px-2 py-1 rounded ${isSelected ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-zinc-400"}`}>
                          {rend.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={categories.length + 3} className="px-6 py-8 text-center text-zinc-500">
                  No hay proveedores con rendimiento en esta categoría.
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-100">{selectedProvider}</h3>
                  <p className="text-xs text-zinc-400">
                    Historial de rendimientos {selectedCategory !== "Todos" ? `(${selectedCategory})` : ""}
                  </p>
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
