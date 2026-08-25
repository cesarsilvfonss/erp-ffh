"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { processBulkPayablePayment } from "@/actions/finance";

export function BulkPayablePaymentModal({
  isOpen,
  onClose,
  payables,
  banks,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  payables: any[];
  banks: any[];
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState("TRANSFER");
  const [bankAccountId, setBankAccountId] = useState(banks[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const totalToPay = payables.reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await processBulkPayablePayment({
      payableIds: payables.map(p => p.id),
      method,
      date,
      reference,
      bankAccountId: (method === "TRANSFER" || method === "CASH") ? bankAccountId : undefined
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError("error" in res ? (res.error as string) : "Ocurrió un error al procesar el pago");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Pago Múltiple</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Cancelando {payables.length} cuentas por un total de <span className="font-bold text-emerald-400">₲ {totalToPay.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Método de Pago</label>
              <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="TRANSFER">Transferencia</option>
                <option value="CASH">Efectivo</option>
                <option value="CHECK">Cheque de Terceros</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Fecha de Pago</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {(method === "TRANSFER" || method === "CASH") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Cuenta de Origen</label>
              <select 
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Seleccione cuenta...</option>
                {banks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Nro. Comprobante / Referencia</label>
            <input 
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Transferencia Basa Nro 12345"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <p className="text-xs text-amber-400 font-medium">
              Nota: Este proceso saldará la totalidad de las deudas seleccionadas y generará un solo movimiento en caja/banco.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium rounded-lg transition-colors border border-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || totalToPay <= 0}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Confirmar Pago Múltiple"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
