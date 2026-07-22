"use client";

import { useState } from "react";
import { registerSlaughter } from "@/actions/slaughter";
import { AnimalCategory } from "@prisma/client";

export function SlaughterForm({ 
  batchId, 
  categories,
  liveWeights
}: { 
  batchId: string;
  categories: string[];
  liveWeights: Record<string, number>;
}) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weights, setWeights] = useState<Record<string, number>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const details = categories.map(cat => ({
      category: cat as AnimalCategory,
      slaughteredWeight: weights[cat] || 0
    })).filter(d => d.slaughteredWeight > 0);

    if (details.length === 0) {
      alert("Debes ingresar al menos un peso faenado mayor a 0.");
      setLoading(false);
      return;
    }

    const res = await registerSlaughter({
      batchId,
      date: new Date(date),
      details,
    });
    
    if (!res.success) {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Faena</label>
        <input 
          type="date" 
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const liveWeight = liveWeights[cat] || 0;
          const slWeight = weights[cat] || 0;
          const yieldPercent = liveWeight > 0 && slWeight > 0 ? ((slWeight / liveWeight) * 100).toFixed(1) : "0.0";

          return (
            <div key={cat} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <div>
                <p className="font-medium text-zinc-100">{cat}</p>
                <p className="text-xs text-zinc-500">Peso Vivo: {liveWeight.toLocaleString()} KG</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Peso Faenado (Gancho)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Ej: 2100.5"
                    value={weights[cat] || ""}
                    onChange={(e) => setWeights({...weights, [cat]: parseFloat(e.target.value) || 0})}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">KG</span>
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-xs font-medium text-zinc-400 mb-1">Rendimiento Estimado</p>
                <p className={`text-lg font-bold ${parseFloat(yieldPercent) >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {yieldPercent}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-zinc-800 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          {loading ? "Procesando..." : "Confirmar Faena y Generar Inventario"}
        </button>
      </div>
    </form>
  );
}
