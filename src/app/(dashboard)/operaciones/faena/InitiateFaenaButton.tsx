"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { initiateFaena } from "@/actions/faena";
import { useRouter } from "next/navigation";

export function InitiateFaenaButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleInitiate() {
    if (!confirm("¿Desea iniciar la faena para este lote?")) return;
    setLoading(true);
    
    const res = await initiateFaena(batchId);
    if (res.success && res.data) {
      router.push(`/operaciones/faena/${res.data.id}`);
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  }

  return (
    <button 
      onClick={handleInitiate}
      disabled={loading}
      className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
    >
      <PlayCircle className="w-4 h-4" />
      {loading ? "Iniciando..." : "Iniciar Faena"}
    </button>
  );
}
