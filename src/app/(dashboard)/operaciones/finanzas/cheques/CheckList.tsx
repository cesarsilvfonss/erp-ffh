"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle, ArrowRightLeft } from "lucide-react";
import { processCheckDeposit } from "@/actions/finance";
import { useRouter } from "next/navigation";

export function CheckList({ initialChecks, banks }: { initialChecks: any[], banks: any[] }) {
  const [checks, setChecks] = useState(initialChecks);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

  async function handleDeposit(checkId: string) {
    if (!selectedBankId) {
      alert("Por favor selecciona un banco de destino.");
      return;
    }

    setIsSubmitting(true);
    const res = await processCheckDeposit(checkId, selectedBankId);
    
    if (res.success) {
      setSelectedCheckId(null);
      setSelectedBankId("");
      router.refresh();
    } else {
      alert(res.error || "Error al depositar el cheque");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Banco / Nro</th>
              <th className="px-6 py-4 font-medium">Emisión / Vencimiento</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Monto</th>
              <th className="px-6 py-4 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {checks.map((check) => {
              const clientName = check.payment.accountReceivable.client.tradeName || check.payment.accountReceivable.client.legalName;
              
              return (
                <tr key={check.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200">
                    {clientName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-300">{check.bankName}</div>
                    <div className="text-xs text-zinc-500 mt-1">Nro: {check.checkNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div>Emi: {format(new Date(check.issueDate), "dd/MM/yyyy")}</div>
                    <div className="text-rose-400 font-medium">Vto: {format(new Date(check.dueDate), "dd/MM/yyyy")}</div>
                  </td>
                  <td className="px-6 py-4">
                    {check.status === "IN_PORTFOLIO" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-amber-400 bg-amber-400/10 border-amber-400/20">
                        <Clock className="w-3.5 h-3.5" /> En Cartera
                      </span>
                    ) : check.status === "DEPOSITED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Depositado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-rose-400 bg-rose-400/10 border-rose-400/20">
                        <XCircle className="w-3.5 h-3.5" /> Rechazado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-zinc-200">
                    {formatCurrency(check.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {check.status === "IN_PORTFOLIO" && (
                      selectedCheckId === check.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <select 
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="w-full max-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          >
                            <option value="">Destino del depósito...</option>
                            {banks.map(b => (
                              <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCheckId(null)}
                              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDeposit(check.id)}
                              disabled={!selectedBankId || isSubmitting}
                              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSubmitting ? "Procesando..." : "Confirmar Depósito"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedCheckId(check.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ArrowRightLeft className="w-4 h-4" /> Depositar
                        </button>
                      )
                    )}
                    {check.status === "DEPOSITED" && (
                      <div className="text-xs text-zinc-500">
                        Depositado en: <br/> {check.depositBank?.bankName}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
