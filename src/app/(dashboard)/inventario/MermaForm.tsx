"use client";

import { useState } from "react";
import { registerMerma } from "@/actions/inventory";
import { AlertTriangle, X } from "lucide-react";

type InventoryLotOption = {
  id: string;
  itemName: string;
  batchNumber: string | number;
  currentStock: number;
};

export function MermaForm({ lots }: { lots: InventoryLotOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lotId || !quantity) return;

    if (!confirm("¿Estás seguro de registrar esta merma? Se descontará del stock valorizado actual y afectará la rentabilidad.")) {
      return;
    }

    setLoading(true);
    const res = await registerMerma({
      inventoryLotId: lotId,
      quantityKg: parseFloat(quantity),
      description
    });

    if (res.success) {
      setIsOpen(false);
      setLotId("");
      setQuantity("");
      setDescription("");
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <AlertTriangle className="w-4 h-4" />
        Registrar Merma
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Registrar Merma
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Lote de Inventario *</label>
                <select 
                  value={lotId}
                  onChange={e => setLotId(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="">Selecciona un lote...</option>
                  {lots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.itemName} - Lote #{lot.batchNumber} ({lot.currentStock} kg disp.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cantidad Mermada (KG) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-rose-500"
                  placeholder="Ej: 15.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción (Opcional)</label>
                <input 
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-rose-500"
                  placeholder="Ej: Deshidratación de cámara"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? "Guardando..." : "Confirmar Merma"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
