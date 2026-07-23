"use client";

import { useState } from "react";
import { addBatchDetail } from "@/actions/batch";
import { AnimalCondition, Item } from "@prisma/client";

export function RomaneoForm({ batchId, items }: { batchId: string, items: Item[] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      batchId,
      itemId: formData.get("itemId") as string,
      condition: formData.get("condition") as AnimalCondition,
      quantity: parseInt(formData.get("quantity") as string),
      netWeight: parseFloat(formData.get("netWeight") as string),
    };

    const res = await addBatchDetail(data);
    
    if (res.success) {
      (e.target as HTMLFormElement).reset();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Artículo (Categoría)</label>
          <select 
            name="itemId"
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Seleccionar...</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Condición</label>
          <select 
            name="condition"
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="GORDO">Gordo</option>
            <option value="FLACO">Flaco</option>
            <option value="DESCARTE">Descarte</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Cabezas</label>
          <input 
            type="number" 
            name="quantity"
            required
            min="1"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            placeholder="Ej: 10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Peso Neto (KG)</label>
          <input 
            type="number" 
            name="netWeight"
            required
            min="1"
            step="0.1"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            placeholder="Ej: 4500.5"
          />
        </div>
      </div>

      <div className="pt-2">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Agregando..." : "Agregar al Romaneo"}
        </button>
      </div>
    </form>
  );
}
