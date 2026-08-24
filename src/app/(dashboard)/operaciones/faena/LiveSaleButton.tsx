"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { sendBatchToLiveSale } from "@/actions/faena";

export function LiveSaleButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSendToStock() {
    if (!confirm("¿Estás seguro de mandar este lote directamente a Stock para Venta en Pie? (Se saltará la faena)")) {
      return;
    }

    setLoading(true);
    const res = await sendBatchToLiveSale(batchId);
    
    if (!res.success) {
      alert("Error: " + res.error);
    }
    
    setLoading(false);
  }

  return (
    <button 
      onClick={handleSendToStock}
      disabled={loading}
      className="flex-1 flex justify-center bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 disabled:opacity-50 px-4 py-2.5 rounded-lg text-sm font-bold transition-all items-center gap-2"
      title="Mandar a Stock (Venta en Pie)"
    >
      <Truck className="w-4 h-4" />
      <span className="hidden lg:inline">Venta en Pie</span>
    </button>
  );
}
