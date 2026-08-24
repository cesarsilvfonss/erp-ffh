"use client";

import { useState } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import { registerMenudencias } from "@/actions/faena";

export function MenudenciaForm({ batchId, maxQuantity }: { batchId: string, maxQuantity: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    
    if (quantity > maxQuantity) {
      setError(`No puedes cargar más de ${maxQuantity} unidades.`);
      return;
    }

    setLoading(true);
    setError("");
    
    const res = await registerMenudencias({
      batchId,
      quantity: Number(quantity)
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setQuantity("");
      }, 2000);
    } else {
      setError(res.error || "Ocurrió un error.");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium px-4 py-2 rounded-lg transition-colors border border-amber-500/20"
      >
        <Plus className="w-4 h-4" />
        Cargar Menudencias
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800/80 bg-zinc-900/50">
              <h3 className="text-xl font-bold text-zinc-100">Cargar Menudencias</h3>
              <button 
                onClick={() => !loading && setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg text-sm flex items-start gap-2">
                  <p>Menudencias cargadas exitosamente al stock con costo cero.</p>
                </div>
              )}

              <div className="bg-zinc-800/30 p-4 rounded-lg border border-zinc-800">
                <p className="text-sm text-zinc-400">Total de reses en este lote:</p>
                <p className="text-2xl font-bold text-amber-500">{maxQuantity}</p>
                <p className="text-xs text-zinc-500 mt-1">No puedes registrar más menudencias que esta cantidad.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Cantidad (Unidades/Juegos)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    setError("");
                    setQuantity(e.target.value ? Number(e.target.value) : "");
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Ej: 15"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Registrando..." : "Cargar a Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
