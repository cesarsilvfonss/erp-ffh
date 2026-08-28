"use client";

import { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { createHookPurchase } from "@/actions/faena";
import { useRouter } from "next/navigation";

export function NewHookPurchaseModal({ providers }: { providers: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [slaughterhouseId, setSlaughterhouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const slaughterhouses = providers.filter(p => p.isSlaughterhouse);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await createHookPurchase({
      date: new Date(date + "T12:00:00Z"),
      providerId,
      slaughterhouseId,
      description
    });

    setLoading(false);

    if (res.success && res.data) {
      setIsOpen(false);
      router.push(`/operaciones/faena/${res.data.id}`);
    } else {
      setError("error" in res ? (res.error as string) : "Error desconocido");
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-900/20"
      >
        <Plus className="w-4 h-4" />
        Compra al Gancho
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-500" />
                  Nueva Compra al Gancho
                </h2>
                <p className="text-sm text-zinc-400 mt-1">Ingreso directo de carne sin romaneo de campo.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Proveedor (Quien vende)</label>
                  <select 
                    required
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Seleccione proveedor...</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.legalName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Frigorífico (Opcional)</label>
                  <select 
                    value={slaughterhouseId}
                    onChange={(e) => setSlaughterhouseId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Ninguno / Propio</option>
                    {slaughterhouses.map(p => (
                      <option key={p.id} value={p.id}>{p.legalName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Fecha</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Observación</label>
                  <input 
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles adicionales..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium rounded-lg transition-colors border border-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Crear Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
