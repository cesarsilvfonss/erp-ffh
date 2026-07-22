"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createProvider } from "@/actions/provider";

export function CreateProviderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      legalName: formData.get("legalName") as string,
      contact: formData.get("contact") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
    };

    const res = await createProvider(data);
    
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
        Nuevo Proveedor
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="font-bold text-lg text-zinc-100">Registrar Proveedor</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Razón Social o Nombre</label>
                <input 
                  type="text" 
                  name="legalName"
                  required
                  placeholder="Ej: Ganadera San Juan S.A."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Persona de Contacto</label>
                <input 
                  type="text" 
                  name="contact"
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  name="phone"
                  placeholder="Ej: 0981 123 456"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Ej: contacto@sanjuan.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-4 py-3 rounded-xl font-bold transition-all"
                >
                  {loading ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
