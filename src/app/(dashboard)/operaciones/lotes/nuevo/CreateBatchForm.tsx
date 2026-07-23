"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBatch } from "@/actions/batch";

export function CreateBatchForm({ providers }: { providers: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const date = new Date(formData.get("date") as string);
    const providerId = formData.get("providerId") as string;
    const description = formData.get("description") as string;

    const res = await createBatch({ date, providerId, description });
    
    if (res.success && res.data) {
      router.push(`/operaciones/lotes/${res.data.id}`);
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Compra</label>
        <input 
          type="date" 
          name="date"
          required
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Proveedor</label>
        <select 
          name="providerId"
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
        >
          <option value="">Seleccione un proveedor...</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.legalName} (RUC: {p.ruc})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Observaciones (Opcional)</label>
        <textarea 
          name="description"
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
          placeholder="Ej: Lote proveniente de estancia La Esperanza"
        />
      </div>

      <div className="pt-4">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
        >
          {loading ? "Abriendo Lote..." : "Abrir Lote"}
        </button>
      </div>
    </form>
  );
}
