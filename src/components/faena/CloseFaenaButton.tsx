"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { closeFaena } from "@/actions/faena";

export function CloseFaenaButton({ 
  slaughterId, 
  totalBoughtHeads, 
  totalFaenaHeads,
  disabled,
  userRole
}: { 
  slaughterId: string;
  totalBoughtHeads: number;
  totalFaenaHeads: number;
  disabled?: boolean;
  userRole?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [faenaDate, setFaenaDate] = useState("");
  
  const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRATION";

  async function handleClose() {
    if (totalFaenaHeads !== totalBoughtHeads) {
      const confirmIncomplete = confirm(
        `¡Atención! Has faenado ${totalFaenaHeads} cabezas, pero el lote comprado es de ${totalBoughtHeads} cabezas. ¿Seguro que quieres cerrar la faena incompleta/diferente?`
      );
      if (!confirmIncomplete) return;
    } else {
      if (!confirm("¿Desea cerrar esta faena? Ya no podrá agregar más registros.")) return;
    }

    setLoading(true);
    
    // Convertir la fecha a formato Date si el admin seleccionó una
    const dateObj = (isAdmin && faenaDate) ? new Date(faenaDate + "T12:00:00Z") : undefined;

    const res = await closeFaena(slaughterId, { totalWeight: 0, yieldPercent: 0, date: dateObj });
    
    if (!res.success) {
      alert("Error cerrando faena: " + res.error);
    }
    
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-4">
      {isAdmin && !disabled && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Fecha faena (Opcional):</label>
          <input 
            type="date" 
            value={faenaDate}
            onChange={(e) => setFaenaDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}
      
      <button
        onClick={handleClose}
        disabled={disabled || loading}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
      >
        <CheckCircle className="w-5 h-5" />
        {loading ? "Cerrando..." : "Cerrar Faena"}
      </button>
    </div>
  );
}
