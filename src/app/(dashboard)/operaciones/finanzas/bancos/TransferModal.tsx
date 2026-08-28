"use client";

import { useState } from "react";
import { X, ArrowRightLeft, AlertCircle } from "lucide-react";
import { processInternalTransfer } from "@/actions/finance";
import { useRouter } from "next/navigation";

export function TransferModal({ banks }: { banks: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fromBankId, setFromBankId] = useState("");
  const [toBankId, setToBankId] = useState("");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [concept, setConcept] = useState("");
  const [reference, setReference] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const fromBank = banks.find(b => b.id === fromBankId);
  const toBank = banks.find(b => b.id === toBankId);

  const isDifferentCurrency = fromBank && toBank && fromBank.currency.code !== toBank.currency.code;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fromBankId === toBankId) {
      setError("La cuenta origen y destino deben ser distintas");
      return;
    }

    setLoading(true);
    setError("");

    const res = await processInternalTransfer({
      fromBankId,
      toBankId,
      amountFrom: Number(amountFrom),
      amountTo: isDifferentCurrency ? Number(amountTo) : Number(amountFrom),
      date,
      concept,
      reference
    });

    setLoading(false);

    if (res.success) {
      setIsOpen(false);
      setFromBankId("");
      setToBankId("");
      setAmountFrom("");
      setAmountTo("");
      setConcept("");
      setReference("");
      router.refresh();
    } else {
      setError(res.error as string);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
      >
        <ArrowRightLeft className="w-4 h-4" />
        Transferencia
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                  Transferencia Interna
                </h2>
                <p className="text-sm text-zinc-400 mt-1">Mueve fondos entre tus cajas y bancos.</p>
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
                  <label className="text-sm font-medium text-zinc-300">Cuenta Origen (Sale de)</label>
                  <select 
                    required
                    value={fromBankId}
                    onChange={(e) => setFromBankId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Seleccione cuenta origen...</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountName} ({bank.currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Cuenta Destino (Entra a)</label>
                  <select 
                    required
                    value={toBankId}
                    onChange={(e) => setToBankId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Seleccione cuenta destino...</option>
                    {banks.filter(b => b.id !== fromBankId).map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountName} ({bank.currency.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Monto a debitar {fromBank && `(${fromBank.currency.code})`}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amountFrom}
                    onChange={e => setAmountFrom(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {isDifferentCurrency && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">
                      Monto a acreditar {toBank && `(${toBank.currency.code})`}
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={amountTo}
                      onChange={e => setAmountTo(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Fecha de Transferencia</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Referencia (Opcional)</label>
                  <input 
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Nro de Boleta..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Concepto</label>
                <input 
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Motivo de la transferencia..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
                />
              </div>

              {isDifferentCurrency && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <p className="text-xs text-amber-400 font-medium">
                    Atención: Estás transfiriendo entre monedas distintas. El monto debitado y acreditado pueden ser diferentes según el tipo de cambio. Revisa bien los importes.
                  </p>
                </div>
              )}

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
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Confirmar Transferencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
