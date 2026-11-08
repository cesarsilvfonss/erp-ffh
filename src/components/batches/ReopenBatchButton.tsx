"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { reopenBatch } from "@/actions/batch";

export function ReopenBatchButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleReopen() {
    if (
      !confirm(
        "¿Desea reabrir la compra de este lote? Se anulará el cierre actual y su cuenta por pagar pendiente para que pueda modificar el romaneo y volver a cerrarlo."
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await reopenBatch(batchId);
    if (!res.success) {
      alert("Error al reabrir lote: " + res.error);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleReopen}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 text-sm font-medium transition-colors disabled:opacity-50"
    >
      <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Reabriendo..." : "Reabrir Compra"}
    </button>
  );
}
