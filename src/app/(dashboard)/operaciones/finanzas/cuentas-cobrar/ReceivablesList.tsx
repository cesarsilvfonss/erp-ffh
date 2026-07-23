"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Banknote, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { PaymentModal } from "./PaymentModal";

export function ReceivablesList({ initialReceivables, banks }: { initialReceivables: any[], banks: any[] }) {
  const [receivables, setReceivables] = useState(initialReceivables);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

  return (
    <>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium w-8"></th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Vencimiento</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Valor Bruto</th>
                <th className="px-6 py-4 font-medium text-right">Pagado / Retenido</th>
                <th className="px-6 py-4 font-medium text-right">Saldo</th>
                <th className="px-6 py-4 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {receivables.map((rec) => {
                const balance = rec.amount - rec.paidAmount;
                const isExpanded = expandedId === rec.id;

                return (
                  <React.Fragment key={rec.id}>
                    <tr className={`hover:bg-zinc-800/50 transition-colors ${isExpanded ? 'bg-zinc-800/30' : ''}`}>
                      <td className="px-6 py-4">
                        {rec.payments?.length > 0 && (
                          <button 
                            onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-200">{rec.client.tradeName || rec.client.legalName}</div>
                        {rec.sale?.invoiceNumber && (
                          <div className="text-xs text-zinc-500 mt-1">Fac: {rec.sale.invoiceNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {format(new Date(rec.dueDate), "dd MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-6 py-4">
                        {rec.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                          </span>
                        ) : rec.status === "PARTIAL" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-amber-400 bg-amber-400/10 border-amber-400/20">
                            <Clock className="w-3.5 h-3.5" /> Parcial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-rose-400 bg-rose-400/10 border-rose-400/20">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-200">
                        {formatCurrency(rec.amount)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-400">
                        {formatCurrency(rec.paidAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-400">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {rec.status !== "PAID" && (
                          <button
                            onClick={() => setSelectedReceivable(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Banknote className="w-4 h-4" /> Registrar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && rec.payments?.length > 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-zinc-900/30">
                          <div className="pl-8 border-l-2 border-zinc-800 space-y-3">
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Historial de Pagos</h4>
                            <div className="space-y-2">
                              {rec.payments.map((payment: any) => (
                                <div key={payment.id} className="flex items-center justify-between text-sm bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-zinc-300">{payment.method}</span>
                                    <span className="text-xs text-zinc-500">
                                      {format(new Date(payment.date), "dd/MM/yyyy HH:mm")}
                                      {payment.reference && ` • Ref: ${payment.reference}`}
                                      {payment.bankAccount && ` • Bco: ${payment.bankAccount.bankName}`}
                                    </span>
                                  </div>
                                  <span className="font-medium text-emerald-400">
                                    {formatCurrency(payment.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal 
        isOpen={!!selectedReceivable}
        onClose={() => setSelectedReceivable(null)}
        receivable={selectedReceivable}
        banks={banks}
      />
    </>
  );
}
