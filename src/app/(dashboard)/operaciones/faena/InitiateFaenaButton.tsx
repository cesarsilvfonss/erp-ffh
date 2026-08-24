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
      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
    >
      <PlayCircle className="w-4 h-4" />
      {loading ? "Iniciando..." : "Iniciar Faena"}
    </button>
  );
}
