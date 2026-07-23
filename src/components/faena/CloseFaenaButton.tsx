"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { closeFaena } from "@/actions/faena";

export function CloseFaenaButton({ 
  slaughterId, 
  totalBoughtHeads, 
  totalFaenaHeads,
  disabled 
}: { 
  slaughterId: string;
  totalBoughtHeads: number;
  totalFaenaHeads: number;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

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
    
    // We would calculate yields here or in the server. 
    // In this case, we send dummy values to the server and the PDF will do the exact math, 
    // or we can calculate real ones. The user said yield should be in PDF. We can just send 0 for now.
    
    const res = await closeFaena(slaughterId, { totalWeight: 0, yieldPercent: 0 });
    
    if (!res.success) {
      alert("Error cerrando faena: " + res.error);
    }
    
    setLoading(false);
  }

  return (
    <button
      onClick={handleClose}
      disabled={disabled || loading}
      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20"
    >
      <CheckCircle className="w-5 h-5" />
      {loading ? "Cerrando..." : "Cerrar Faena"}
    </button>
  );
}
