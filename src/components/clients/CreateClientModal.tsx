"use client";

import { useState } from "react";
import { X, Plus, Save } from "lucide-react";
import { createClient } from "@/actions/client";

export function CreateClientModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      legalName: formData.get("legalName") as string,
      tradeName: formData.get("tradeName") as string,
      contact: formData.get("contact") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      paymentTermDays: parseInt(formData.get("paymentTermDays") as string) || 0,
      isIvaRetainer: formData.get("isIvaRetainer") === "on",
      isRentRetainer: formData.get("isRentRetainer") === "on",
      notes: formData.get("notes") as string,
    };

    const res = await createClient(data);
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
        Nuevo Cliente
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <h2 className="font-bold text-xl text-zinc-100">Registrar Cliente</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Razón Social *</label>
                  <input 
                    name="legalName"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">RUC / Cédula</label>
                  <input 
                    name="tradeName"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Contacto</label>
                  <input 
                    name="contact"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                  <input 
                    name="phone"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input 
                    name="email"
                    type="email"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Término de Pago (Días)</label>
                  <input 
                    name="paymentTermDays"
                    type="number"
                    defaultValue={0}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-3 mt-2 bg-zinc-950 border border-zinc-800/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-zinc-300">Configuración Fiscal</h3>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        name="isIvaRetainer"
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                      <svg className="absolute w-3 h-3 text-zinc-950 opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">Es Retentor de IVA</span>
                      <p className="text-xs text-zinc-500">Descuenta de la venta (Monto/21)*0.3</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        name="isRentRetainer"
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                      <svg className="absolute w-3 h-3 text-zinc-950 opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">Es Retentor de Renta</span>
                      <p className="text-xs text-zinc-500">Descuenta de la venta (Monto-(Monto/21))*0.004</p>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Notas</label>
                  <textarea 
                    name="notes"
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-6 py-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-sm"
                >
                  {loading && <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />}
                  {!loading && <Save className="w-4 h-4" />}
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
