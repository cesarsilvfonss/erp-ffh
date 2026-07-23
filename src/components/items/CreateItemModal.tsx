"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createItem } from "@/actions/item";

export function CreateItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      unit: formData.get("unit") as string,
      description: formData.get("description") as string,
      isSlaughterable: formData.get("isSlaughterable") === "on",
    };

    const res = await createItem(data);
    
    if (res.success) {
      setIsOpen(false);
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        <Plus className="w-4 h-4" />
        Nuevo Artículo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 shrink-0 rounded-t-2xl">
              <h2 className="font-bold text-lg text-zinc-100">Registrar Artículo</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">


              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre *</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  placeholder="Ej: Media Res Vaca"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría *</label>
                  <select 
                    name="category"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Carne">Carne</option>
                    <option value="Menudencia">Menudencia</option>
                    <option value="Cuero">Cuero</option>
                    <option value="Ganado Vivo">Ganado Vivo</option>
                    <option value="Servicio">Servicio</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Unidad *</label>
                  <select 
                    name="unit"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="UN">Unidades (UN)</option>
                    <option value="LT">Litros (LT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
                <textarea 
                  name="description"
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSlaughterable"
                  name="isSlaughterable"
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
                />
                <label htmlFor="isSlaughterable" className="text-sm text-zinc-300">
                  Es Faenable (Ej: Vaca, Toro, Novillo)
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-3 rounded-xl font-bold transition-all"
                >
                  {loading ? "Guardando..." : "Guardar Artículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
