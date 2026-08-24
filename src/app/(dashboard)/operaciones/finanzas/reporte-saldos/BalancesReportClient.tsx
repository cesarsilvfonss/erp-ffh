"use client";

import { Printer, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ReportData = {
  client: any;
  receivables: any[];
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
};

export function BalancesReportClient({ data }: { data: ReportData[] }) {
  const globalTotalPending = data.reduce((acc, curr) => acc + curr.totalPending, 0);

  function handlePrint() {
    window.print();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function calculateDelayDays(dueDateStr: string) {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6 md:p-8 print:p-0 print:bg-white print:text-black">
      
      {/* Botones de acción - Ocultos en impresión */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Link 
          href="/operaciones/finanzas/cuentas-cobrar"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50 px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cuentas por Cobrar
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold px-6 py-2.5 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir Reporte
        </button>
      </div>

      {/* Cabecera del Reporte */}
      <div className="border-b border-zinc-800 print:border-gray-300 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 print:text-black mb-2">Reporte de Saldos de Clientes</h1>
          <p className="text-zinc-400 print:text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 
            Generado el: {new Date().toLocaleDateString("es-PY", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="bg-zinc-900 print:bg-gray-100 p-4 rounded-xl border border-zinc-800 print:border-gray-300 text-right">
          <p className="text-sm text-zinc-500 print:text-gray-500 font-medium mb-1">Total Global Pendiente</p>
          <p className="text-2xl font-black text-emerald-400 print:text-black">
            {formatCurrency(globalTotalPending)}
          </p>
        </div>
      </div>

      {/* Contenido del Reporte */}
      <div className="space-y-12">
        {data.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
            No hay saldos pendientes para mostrar.
          </div>
        ) : (
          data.map((clientData, index) => (
            <div 
              key={clientData.client.id} 
              className="bg-zinc-900/40 print:bg-white rounded-2xl border border-zinc-800/50 print:border-gray-300 overflow-hidden break-inside-avoid"
            >
              <div className="bg-zinc-800/50 print:bg-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 print:text-black">{clientData.client.legalName}</h2>
                  <p className="text-sm text-zinc-400 print:text-gray-600">RUC: {clientData.client.ruc || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500 print:text-gray-600 font-medium">Saldo Cliente</p>
                  <p className="text-lg font-bold text-rose-400 print:text-black">{formatCurrency(clientData.totalPending)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 print:border-gray-300 bg-zinc-900/20 print:bg-gray-50">
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider">Fecha Fac.</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider">Nro Factura</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider">Vencimiento</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider">Atraso</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider text-right">Valor Original</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider text-right">Cobrado</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-400 print:text-gray-600 uppercase tracking-wider text-right">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 print:divide-gray-200">
                    {clientData.receivables.map((rec) => {
                      const pending = rec.amount - rec.paidAmount;
                      const delay = calculateDelayDays(rec.dueDate);
                      const isOverdue = delay > 0;

                      return (
                        <tr key={rec.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 text-sm text-zinc-300 print:text-black">
                            {rec.sale?.date ? new Date(rec.sale.date).toLocaleDateString("es-PY") : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-zinc-200 print:text-black">
                            {rec.sale?.invoiceNumber || "S/N"}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300 print:text-black">
                            {new Date(rec.dueDate).toLocaleDateString("es-PY")}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {isOverdue ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 print:bg-transparent print:text-black print:p-0">
                                {delay} días
                              </span>
                            ) : (
                              <span className="text-zinc-500 print:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400 print:text-gray-600 text-right">
                            {formatCurrency(rec.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-emerald-400/80 print:text-gray-600 text-right">
                            {formatCurrency(rec.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-rose-400/90 print:text-black text-right">
                            {formatCurrency(pending)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-900/60 print:bg-gray-100 border-t-2 border-zinc-700 print:border-gray-400">
                      <td colSpan={4} className="px-6 py-4 text-sm font-bold text-zinc-300 print:text-black text-right">
                        Subtotal {clientData.client.legalName}:
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-zinc-400 print:text-black text-right">
                        {formatCurrency(clientData.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-400/80 print:text-black text-right">
                        {formatCurrency(clientData.totalPaid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-rose-400 print:text-black text-right">
                        {formatCurrency(clientData.totalPending)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 text-center text-zinc-500 print:text-gray-500 text-xs pb-8">
        Reporte generado desde Sistema FFH.
      </div>
    </div>
  );
}
