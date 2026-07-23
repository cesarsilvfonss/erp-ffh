"use client";

import { useState, useRef, useEffect } from "react";
import { addFaenaDetail } from "@/actions/faena";
import { SlaughterCondition, Item } from "@prisma/client";
import { Save } from "lucide-react";

export function FaenaForm({ 
  slaughterId, 
  availableItems 
}: { 
  slaughterId: string;
  availableItems: Item[];
}) {
  const [itemId, setItemId] = useState<string>(availableItems[0]?.id || "");
  const [condition, setCondition] = useState<SlaughterCondition>("CON_COBERTURA");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus al montar
  useEffect(() => {
    weightInputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!weight || isNaN(parseFloat(weight)) || !itemId) return;

    setLoading(true);
    const res = await addFaenaDetail({
      slaughterId,
      itemId,
      condition,
      weight: parseFloat(weight)
    });

    if (res.success) {
      // Limpiamos SOLO el peso. Mantenemos artículo y condición para velocidad.
      setWeight("");
    } else {
      alert("Error: " + res.error);
    }
    
    setLoading(false);
    // Volver a enfocar el input para seguir cargando
    setTimeout(() => {
      weightInputRef.current?.focus();
    }, 10);
  }

  return (
    <div className="bg-zinc-900 border border-emerald-900/50 rounded-xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <h2 className="font-bold text-emerald-400">Carga Rápida al Gancho</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
        
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Categoría</label>
          <select 
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            disabled={loading}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            {availableItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Cobertura / Estado</label>
          <select 
            value={condition}
            onChange={(e) => setCondition(e.target.value as SlaughterCondition)}
            disabled={loading}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="CON_COBERTURA">Con Cobertura</option>
            <option value="SIN_COBERTURA">Sin Cobertura</option>
            <option value="FLACO">Flaco</option>
            <option value="GOLPEADO">Golpeado</option>
          </select>
        </div>

        <div className="w-full md:w-1/3 relative">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Peso (KG) *</label>
          <input 
            ref={weightInputRef}
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={loading}
            placeholder="Ej: 125.5"
            className="w-full bg-emerald-950/20 border-2 border-emerald-900/50 rounded-lg px-3 py-2 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 placeholder-emerald-900/50 transition-colors"
          />
          <div className="absolute right-3 top-8 text-xs text-emerald-600 font-medium">KG</div>
        </div>

        <button
          type="submit"
          disabled={loading || !weight || !itemId}
          className="flex w-full md:w-auto justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all items-center gap-2 h-[46px]"
        >
          <Save className="w-5 h-5 md:w-4 md:h-4" />
          <span className="md:hidden">Insertar Peso</span>
        </button>
      </form>
      <p className="text-[10px] text-zinc-500 mt-3 italic">
        Tip (PC): Escribe el peso y presiona "Enter" para guardar e insertar el siguiente rápidamente.
      </p>
    </div>
  );
}
