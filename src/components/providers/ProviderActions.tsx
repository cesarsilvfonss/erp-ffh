"use client";

import { useState } from "react";
import { Edit2, Trash2, X, Save } from "lucide-react";
import { updateProvider, deleteProvider } from "@/actions/provider";
import { useSession } from "next-auth/react";

export function ProviderActions({ provider }: { provider: any }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor ${provider.legalName}?`)) return;
    
    setLoading(true);
    const res = await deleteProvider(provider.id);
    if (!res.success) {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      legalName: formData.get("legalName") as string,
      ruc: formData.get("ruc") as string,
      tradeName: formData.get("tradeName") as string,
      address: formData.get("address") as string,
      contact: formData.get("contact") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      isSlaughterhouse: formData.get("isSlaughterhouse") === "on",
    };

    const res = await updateProvider(provider.id, data);
    if (res.success) {
      setIsEditOpen(false);
    } else {
      alert("Error: " + ('error' in res ? res.error : "Error desconocido"));
    }
    setLoading(false);
  };

  if (!isAdmin) return null;

  return (
    <>
      <button 
        onClick={() => setIsEditOpen(true)}
        disabled={loading}
        className="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-md hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
        title="Editar Proveedor"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button 
        onClick={handleDelete}
        disabled={loading}
        className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors disabled:opacity-50"
        title="Eliminar Proveedor"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <h2 className="font-bold text-xl text-zinc-100">Editar Proveedor</h2>
              <button 
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Razón Social *</label>
                  <input 
                    name="legalName"
                    required
                    defaultValue={provider.legalName}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre de Fantasía</label>
                  <input 
                    name="tradeName"
                    defaultValue={provider.tradeName || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">RUC / Identificación</label>
                  <input 
                    name="ruc"
                    defaultValue={provider.ruc || ""}
                    placeholder="Generado autom. si se deja vacío"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Dirección</label>
                  <input 
                    name="address"
                    defaultValue={provider.address || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Contacto Principal</label>
                  <input 
                    name="contact"
                    defaultValue={provider.contact || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                  <input 
                    name="phone"
                    defaultValue={provider.phone || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input 
                    name="email"
                    type="email"
                    defaultValue={provider.email || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group w-max">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        name="isSlaughterhouse"
                        defaultChecked={provider.isSlaughterhouse}
                        className="peer sr-only" 
                      />
                      <div className="w-5 h-5 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
                      <svg className="w-3.5 h-3.5 text-zinc-950 absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors block">
                        Es Frigorífico (Lugar de Faena)
                      </span>
                      <span className="text-xs text-zinc-500 mt-0.5 block">
                        Marcar esta opción permite seleccionar a este proveedor como destino en la faena.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 sticky bottom-0 bg-zinc-900 pb-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
