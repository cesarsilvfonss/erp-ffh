"use client";

import { useState } from "react";
import { Trash2, Edit2, X } from "lucide-react";
import { deleteBatchDetail, updateBatchDetail } from "@/actions/batch";
import { AnimalCondition, Item } from "@prisma/client";

export function BatchDetailActions({ 
  detail, 
  batchId,
  items
}: { 
  detail: any; 
  batchId: string;
  items: Item[];
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Seguro que deseas eliminar este pesaje?")) return;
    setIsDeleting(true);
    const res = await deleteBatchDetail(detail.id, batchId);
    if (!res.success) alert("Error: " + res.error);
    setIsDeleting(false);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      id: detail.id,
      batchId,
      itemId: formData.get("itemId") as string,
      condition: formData.get("condition") as AnimalCondition,
      quantity: parseInt(formData.get("quantity") as string),
      netWeight: parseFloat(formData.get("netWeight") as string),
    };

    const res = await updateBatchDetail(data);
    if (res.success) {
      setIsEditing(false);
    } else {
      alert("Error: " + res.error);
    }
    setIsSubmitting(false);
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => setIsEditing(true)} 
          disabled={isDeleting}
          className="p-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors"
          title="Editar"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={handleDelete} 
          disabled={isDeleting}
          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-md transition-colors disabled:opacity-50"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="font-bold text-lg text-zinc-100">Editar Pesaje</h2>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Artículo (Categoría)</label>
                    <select 
                      name="itemId"
                      defaultValue={detail.itemId}
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    >
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Condición</label>
                    <select 
                      name="condition"
                      defaultValue={detail.condition}
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="GORDO">Gordo</option>
                      <option value="FLACO">Flaco</option>
                      <option value="DESCARTE">Descarte</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Cabezas</label>
                    <input 
                      type="number" 
                      name="quantity"
                      defaultValue={detail.quantity}
                      required
                      min="1"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Peso Neto (KG)</label>
                    <input 
                      type="number" 
                      name="netWeight"
                      defaultValue={detail.netWeight}
                      required
                      min="1"
                      step="0.1"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
