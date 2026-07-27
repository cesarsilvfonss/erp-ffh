"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, CheckCircle2 } from "lucide-react";
import { processPayablePayment } from "@/actions/finance";

export function PayablePaymentModal({
  isOpen,
  onClose,
  payable,
  banks
}: {
  isOpen: boolean;
  onClose: () => void;
  payable: any;
  banks: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("TRANSFER");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState(banks[0]?.id || "");
  const [reference, setReference] = useState("");

  if (!isOpen || !payable) return null;

  const balance = payable.amount - payable.paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > balance) {
      alert("El monto ingresado es mayor al saldo pendiente.");
      return;
    }

    setLoading(true);
    const res = await processPayablePayment({
      payableId: payable.id,
      amount: parseFloat(amount),
      method,
      date,
      bankAccountId: (method === "CASH" || method === "TRANSFER") ? bankAccountId : undefined,
      reference
    });

    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      alert("Error: " + ('error' in res ? res.error : "Error desconocido"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Registrar Pago
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {payable.provider.legalName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-500/80">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                ₲ {balance.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Monto a Pagar (₲) *</label>
              <input
                type="number"
                required
                max={balance}
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Fecha de Pago *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Método de Pago *</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="TRANSFER">Transferencia Bancaria</option>
              <option value="CASH">Efectivo (Caja)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cuenta de Origen *</label>
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.currency.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">N° Comprobante / Referencia</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Ej: Transferencia 123456"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 text-sm font-bold rounded-lg transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
