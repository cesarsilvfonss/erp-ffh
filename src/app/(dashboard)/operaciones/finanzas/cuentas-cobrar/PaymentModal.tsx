"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Wallet, Building2, Calendar, FileText } from "lucide-react";
import { processPayment } from "@/actions/finance";
import { useRouter } from "next/navigation";

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

  // State for the payment form
  const [method, setMethod] = useState("TRANSFER");
  const [amount, setAmount] = useState(0);
  
  // State for Check
  const [checkBank, setCheckBank] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (receivable) {
      setAmount(receivable.amount - receivable.paidAmount);
      
      // Si el método seleccionado es RETENTION, precargar con retenciones de la venta si existen
      if (method === "RETENTION" && receivable.sale) {
        const remainingRetention = (receivable.sale.ivaRetention || 0) + (receivable.sale.rentRetention || 0);
        // Sugerir la retención que falte por aplicar, esto requeriría lógica extra, 
        // por ahora solo sugerimos el total o el saldo
        setAmount(Math.min(remainingRetention, receivable.amount - receivable.paidAmount));
      } else {
        setAmount(receivable.amount - receivable.paidAmount);
      }
    }
  }, [receivable, method]);

  if (!isOpen || !receivable) return null;

  const balance = receivable.amount - receivable.paidAmount;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      receivableId: receivable.id,
      amount: Number(formData.get("amount")),
      method: formData.get("method") as string,
      date: formData.get("date") as string,
      reference: formData.get("reference") as string,
      bankAccountId: formData.get("bankAccountId") as string,
      
      // Check data
      checkBank: formData.get("checkBank") as string,
      checkNumber: formData.get("checkNumber") as string,
      issueDate: formData.get("issueDate") as string,
      dueDate: formData.get("dueDate") as string,
    };

    if (data.amount <= 0 || data.amount > balance) {
      setError(`El monto debe ser mayor a 0 y menor o igual al saldo (${balance})`);
      setIsSubmitting(false);
      return;
    }

    const res = await processPayment(data);
    
    if (res.success) {
      onClose();
      router.refresh();
    } else {
      setError(res.error || "Error al procesar el pago");
    }
    
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Registrar Pago
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Cliente: <strong className="text-zinc-200">{receivable.client.tradeName || receivable.client.legalName}</strong>
            </p>
          </div>
          <button 
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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Valor Bruto Factura</p>
                <p className="text-xl font-semibold text-zinc-200">
                  ₲ {receivable.amount.toLocaleString("es-PY")}
                </p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-sm text-emerald-500/70 mb-1">Saldo Pendiente</p>
                <p className="text-xl font-bold text-emerald-400">
                  ₲ {balance.toLocaleString("es-PY")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Método de Pago</label>
                <select 
                  name="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="TRANSFER">Transferencia Bancaria</option>
                  <option value="CASH">Efectivo</option>
                  <option value="CHECK">Cheque Diferido</option>
                  <option value="RETENTION">Retención (IVA/Renta)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Fecha de Pago</label>
                <input 
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {(method === "TRANSFER" || method === "CASH") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Banco de Destino</label>
                  <select 
                    name="bankAccountId"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Seleccione un banco...</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNumber} ({bank.currency.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Referencia (Opcional)</label>
                  <input 
                    name="reference"
                    type="text"
                    placeholder="Nro de Operación..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            )}

            {method === "CHECK" && (
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-4">
                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" /> Datos del Cheque Diferido
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Banco de Emisión</label>
                    <input 
                      name="checkBank"
                      type="text"
                      required
                      placeholder="Ej: Banco Itaú"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nro. de Cheque</label>
                    <input 
                      name="checkNumber"
                      type="text"
                      required
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Fecha Emisión</label>
                    <input 
                      name="issueDate"
                      type="date"
                      required
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Fecha Vencimiento</label>
                    <input 
                      name="dueDate"
                      type="date"
                      required
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "RETENTION" && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nro. Comprobante de Retención</label>
                <input 
                  name="reference"
                  type="text"
                  required
                  placeholder="001-001-XXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-1.5">Monto a Pagar / Aplicar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₲</span>
                <input 
                  name="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  min="1"
                  max={balance}
                  step="1"
                  className="w-full bg-zinc-900 border border-emerald-500/30 rounded-lg pl-10 pr-4 py-3 text-lg font-semibold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 shrink-0 bg-zinc-950 flex gap-3 justify-end rounded-b-2xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            form="payment-form"
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );
}
