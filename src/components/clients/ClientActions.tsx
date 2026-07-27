"use client";

import { useState } from "react";
import { Edit2, Trash2, X, Save, CheckCircle2 } from "lucide-react";
import { updateClient, deleteClient } from "@/actions/client";
import { useSession } from "next-auth/react";

export function ClientActions({ client }: { client: any }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar el cliente ${client.legalName}?`)) return;
    
    setLoading(true);
    const res = await deleteClient(client.id);
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
      contact: formData.get("contact") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      paymentTermDays: parseInt(formData.get("paymentTermDays") as string) || 0,
      isIvaRetainer: formData.get("isIvaRetainer") === "on",
      isRentRetainer: formData.get("isRentRetainer") === "on",
      notes: formData.get("notes") as string,
    };

    const res = await updateClient(client.id, data);
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
        title="Editar Cliente"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button 
        onClick={handleDelete}
        disabled={loading}
        className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors disabled:opacity-50"
        title="Eliminar Cliente"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <h2 className="font-bold text-xl text-zinc-100">Editar Cliente</h2>
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
                    defaultValue={client.legalName}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">RUC / Cédula</label>
                  <input 
                    name="ruc"
                    defaultValue={client.ruc || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Contacto</label>
                  <input 
                    name="contact"
                    defaultValue={client.contact || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                  <input 
                    name="phone"
                    defaultValue={client.phone || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input 
                    name="email"
                    type="email"
                    defaultValue={client.email || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Plazo de Crédito (Días)</label>
                  <input 
                    name="paymentTermDays"
                    type="number"
                    min="0"
                    defaultValue={client.paymentTermDays}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        name="isIvaRetainer"
                        defaultChecked={client.isIvaRetainer}
                        className="peer sr-only" 
                      />
                      <div className="w-5 h-5 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Es Agente Retentor IVA</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        name="isRentRetainer"
                        defaultChecked={client.isRentRetainer}
                        className="peer sr-only" 
                      />
                      <div className="w-5 h-5 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Es Agente Retentor Renta</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Notas / Observaciones</label>
                  <textarea 
                    name="notes"
                    rows={2}
                    defaultValue={client.notes || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
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
