"use client";

import { useState, useRef, useEffect } from "react";
import { addFaenaDetail, addBulkFaenaDetail } from "@/actions/faena";
import { Item } from "@prisma/client";
import { Save, Layers } from "lucide-react";

export function FaenaForm({ 
  slaughterId, 
  availableItems,
  userRole
}: { 
  slaughterId: string;
  availableItems: Item[];
  userRole?: string;
}) {
  const [itemId, setItemId] = useState<string>(availableItems[0]?.id || "");
  const [weight, setWeight] = useState("");
  const [heads, setHeads] = useState("1");
  const [loading, setLoading] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  const weightInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRATION";

  // Auto-focus al montar
  useEffect(() => {
    weightInputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!weight || isNaN(parseFloat(weight)) || !itemId) return;

    setLoading(true);

    if (isBulkMode && isAdmin) {
      if (!heads || isNaN(parseInt(heads)) || parseInt(heads) <= 0) {
        alert("Ingrese una cantidad válida de reses.");
        setLoading(false);
        return;
      }
      
      const res = await addBulkFaenaDetail({
        slaughterId,
        itemId,
        totalWeight: parseFloat(weight),
        heads: parseInt(heads)
      });

      if (res.success) {
        setWeight("");
        setHeads("1");
      } else {
        alert("Error: " + res.error);
      }
    } else {
      const res = await addFaenaDetail({
        slaughterId,
        itemId,
        weight: parseFloat(weight)
      });

      if (res.success) {
        setWeight("");
      } else {
        alert("Error: " + res.error);
      }
    }
    
    setLoading(false);
    // Volver a enfocar el input para seguir cargando
    setTimeout(() => {
      weightInputRef.current?.focus();
    }, 10);
  }

  return (
    <div className="bg-zinc-900 border border-emerald-900/50 rounded-xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h2 className="font-bold text-emerald-400">
            {isBulkMode ? "Carga Masiva (Lote Completo)" : "Carga Rápida al Gancho"}
          </h2>
        </div>
        
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsBulkMode(!isBulkMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isBulkMode 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
            }`}
          >
            <Layers className="w-3 h-3" />
            {isBulkMode ? "Modo Masivo Activo" : "Cambiar a Modo Masivo"}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
        
        <div className="w-full md:flex-1">
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

        {isBulkMode && (
          <div className="w-full md:w-32 relative">
            <label className="block text-xs font-medium text-zinc-400 mb-1">Total Reses *</label>
            <input 
              type="number"
              step="1"
              min="1"
              value={heads}
              onChange={(e) => setHeads(e.target.value)}
              disabled={loading}
              placeholder="Ej: 90"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        )}

        <div className="w-full md:flex-1 relative">
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            {isBulkMode ? "Peso Total (KG) *" : "Peso (KG) *"}
          </label>
          <input 
            ref={weightInputRef}
            type="number"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={loading}
            placeholder={isBulkMode ? "Ej: 12500.5" : "Ej: 125.5"}
            className="w-full bg-emerald-950/20 border-2 border-emerald-900/50 rounded-lg px-3 py-2 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 placeholder-emerald-900/50 transition-colors"
          />
          <div className="absolute right-3 top-8 text-xs text-emerald-600 font-medium">KG</div>
        </div>

        <button
          type="submit"
          disabled={loading || !weight || !itemId || (isBulkMode && !heads)}
          className="flex w-full md:w-auto justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all items-center gap-2 h-[46px]"
        >
          <Save className="w-5 h-5 md:w-4 md:h-4" />
          <span className="md:hidden">Insertar Peso</span>
        </button>
      </form>
      <p className="text-[10px] text-zinc-500 mt-3 italic">
        {isBulkMode 
          ? "Tip: Al insertar en Modo Masivo, el sistema generará automáticamente los registros de medias reses necesarios distribuyendo el peso equitativamente." 
          : "Tip (PC): Escribe el peso y presiona 'Enter' para guardar e insertar el siguiente rápidamente."}
      </p>
    </div>
  );
}
