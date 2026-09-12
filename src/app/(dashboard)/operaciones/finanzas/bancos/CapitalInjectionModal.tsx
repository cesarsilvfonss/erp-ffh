"use client";

import { useState } from "react";
import { X, Save, DollarSign } from "lucide-react";
import { injectCapital } from "@/actions/banks";

export function CapitalInjectionModal({ 
  banks, 
  providers 
}: { 
  banks: any[],
  providers: any[]
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [providerId, setProviderId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  const handleClose = () => {
    setIsOpen(false);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setProviderId("");
    setBankAccountId("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!date || !amount || !providerId || !bankAccountId) {
      setError("Todos los campos son obligatorios.");
      setLoading(false);
      return;
    }

    const provider = providers.find(p => p.id === providerId);
    
    const tzDate = new Date(date + "T12:00:00Z");

    const res = await injectCapital({
      bankAccountId,
      providerId,
      providerName: provider?.legalName || "Accionista",
      date: tzDate,
      amount: Number(amount)
    });

    if (!res.success) {
      setError(res.error || "Ocurrió un error.");
      setLoading(false);
    } else {
      setLoading(false);
      handleClose();
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <DollarSign className="w-4 h-4 text-emerald-400" />
        Inyección de Capital
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2 text-zinc-100">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Inyección de Capital</h3>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Fecha</label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Accionista (Proveedor)</label>
                <select
                  required
                  value={providerId}
                  onChange={e => setProviderId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Seleccione un accionista</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.legalName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cuenta a Acreditar</label>
                <select
                  required
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Seleccione una cuenta</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Monto (Gs)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 text-zinc-300 font-medium hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
