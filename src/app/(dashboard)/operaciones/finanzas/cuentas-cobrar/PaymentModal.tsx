"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Wallet, Plus, Trash2, Building2, Calendar, FileText } from "lucide-react";
import { processPayment } from "@/actions/finance";
import { useRouter } from "next/navigation";

type PaymentLine = {
  id: string;
  method: string;
  amount: number;
  reference: string;
  bankAccountId: string;
  checkBank: string;
  checkNumber: string;
  issueDate: string;
  dueDate: string;
};

export function PaymentModal({ 
  isOpen, 
  onClose, 
  receivable,
  banks 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  receivable: any;
  banks: any[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payments, setPayments] = useState<PaymentLine[]>([]);

  useEffect(() => {
    if (receivable && isOpen) {
      setPayments([{
        id: String(Date.now() + Math.random()),
        method: "TRANSFER",
        amount: receivable.amount - receivable.paidAmount,
        reference: "",
        bankAccountId: banks[0]?.id || "",
        checkBank: "",
        checkNumber: "",
        issueDate: "",
        dueDate: ""
      }]);
      setDate(new Date().toISOString().split("T")[0]);
      setError("");
    }
  }, [receivable, isOpen, banks]);

  if (!isOpen || !receivable) return null;

  const balance = receivable.amount - receivable.paidAmount;
  const totalPaying = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remaining = balance - totalPaying;

  function addPaymentLine() {
    setPayments([...payments, {
      id: String(Date.now() + Math.random()),
      method: "TRANSFER",
      amount: remaining > 0 ? remaining : 0,
      reference: "",
      bankAccountId: banks[0]?.id || "",
      checkBank: "",
      checkNumber: "",
      issueDate: "",
      dueDate: ""
    }]);
  }

  function removePaymentLine(id: string) {
    setPayments(payments.filter(p => p.id !== id));
  }

  function updatePaymentLine(id: string, field: keyof PaymentLine, value: any) {
    setPayments(payments.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      
      // Auto-calculate retention amounts when method changes
      if (field === "method") {
        if (value === "RETENTION_IVA") {
          updated.amount = (receivable.amount / 21) * 0.3;
        } else if (value === "RETENTION_RENTA") {
          updated.amount = (receivable.amount - (receivable.amount / 21)) * 0.004;
        }
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (totalPaying <= 0) {
      setError("El monto a pagar debe ser mayor a 0");
      setIsSubmitting(false);
      return;
    }
    
    // Check constraints
    if (totalPaying > balance + 1) {
      setError(`La suma de los pagos (${totalPaying.toLocaleString("es-PY")}) supera el saldo pendiente (${balance.toLocaleString("es-PY")})`);
      setIsSubmitting(false);
      return;
    }

    const res = await processPayment({
      receivableId: receivable.id,
      date,
      payments: payments.map(p => ({
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        bankAccountId: p.bankAccountId,
        checkBank: p.checkBank,
        checkNumber: p.checkNumber,
        issueDate: p.issueDate,
        dueDate: p.dueDate
      }))
    });

    if (res.success) {
      onClose();
      router.refresh();
    } else {
      setError((res as any).error || "Error al procesar el pago");
    }
    
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Registrar Cobranza
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Factura: {receivable.sale?.invoiceNumber || "S/N"} | Cliente: <strong className="text-zinc-200">{receivable.client.legalName}</strong>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Valor Bruto Factura</p>
                <p className="text-xl font-semibold text-zinc-200">
                  ₲ {receivable.amount.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Saldo Pendiente</p>
                <p className="text-xl font-bold text-zinc-200">
                  ₲ {balance.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-sm text-emerald-500/70 mb-1">Total a Cobrar</p>
                <p className="text-xl font-bold text-emerald-400">
                  ₲ {totalPaying.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Restante</p>
                <p className={`text-xl font-bold ${remaining < -1 ? "text-rose-400" : "text-zinc-400"}`}>
                  ₲ {remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Fecha de Cobro *</label>
              <input 
                type="date" 
                name="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full md:w-1/3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-semibold text-zinc-300">Detalles de Cobro</h3>
                <button 
                  type="button" 
                  onClick={addPaymentLine}
                  className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Agregar Medio
                </button>
              </div>

              {payments.map((p, index) => (
                <div key={p.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 space-y-4 relative group">
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentLine(p.id)}
                      className="absolute top-4 right-4 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Eliminar línea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Medio de Pago</label>
                      <select 
                        value={p.method}
                        onChange={(e) => updatePaymentLine(p.id, "method", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="TRANSFER">Transferencia</option>
                        <option value="CASH">Efectivo</option>
                        <option value="CHECK">Cheque Diferido</option>
                        <option value="RETENTION_IVA">Retención de IVA</option>
                        <option value="RETENTION_RENTA">Retención de Renta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Monto (₲)</label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={p.amount || ""}
                        onChange={(e) => updatePaymentLine(p.id, "amount", Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {(p.method === "TRANSFER" || p.method === "CASH") && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Cuenta Destino</label>
                        <select
                          value={p.bankAccountId}
                          onChange={(e) => updatePaymentLine(p.id, "bankAccountId", e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="">Selecciona cuenta...</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(p.method === "TRANSFER" || p.method === "CASH") && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Referencia</label>
                        <input
                          type="text"
                          value={p.reference}
                          onChange={(e) => updatePaymentLine(p.id, "reference", e.target.value)}
                          placeholder="Nro comprobante"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    )}

                    {p.method === "CHECK" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Banco (Cheque)</label>
                          <input
                            type="text"
                            value={p.checkBank}
                            onChange={(e) => updatePaymentLine(p.id, "checkBank", e.target.value)}
                            required
                            placeholder="Ej: Banco Familiar"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Número de Cheque</label>
                          <input
                            type="text"
                            value={p.checkNumber}
                            onChange={(e) => updatePaymentLine(p.id, "checkNumber", e.target.value)}
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">F. Emisión</label>
                          <input
                            type="date"
                            value={p.issueDate}
                            onChange={(e) => updatePaymentLine(p.id, "issueDate", e.target.value)}
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">F. Vencimiento</label>
                          <input
                            type="date"
                            value={p.dueDate}
                            onChange={(e) => updatePaymentLine(p.id, "dueDate", e.target.value)}
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 flex gap-4 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="payment-form"
            disabled={isSubmitting || totalPaying <= 0 || totalPaying > balance + 1}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 rounded-lg font-bold transition-colors flex items-center justify-center"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Cobranza"}
          </button>
        </div>
      </div>
    </div>
  );
}
