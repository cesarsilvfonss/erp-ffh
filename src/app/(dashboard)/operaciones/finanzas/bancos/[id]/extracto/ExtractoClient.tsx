"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Building2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ExtractoClient({ 
  bank, 
  rows, 
  previousBalance,
  currentBalance,
  selectedMonth,
  selectedYear
}: { 
  bank: any, 
  rows: any[], 
  previousBalance: number,
  currentBalance: number,
  selectedMonth: number,
  selectedYear: number
}) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: bank.currency.code, maximumFractionDigits: 0 }).format(val);

  function handlePrint() {
    window.print();
  }

  function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>, type: 'month' | 'year') {
    const val = parseInt(e.target.value);
    const m = type === 'month' ? val : selectedMonth;
    const y = type === 'year' ? val : selectedYear;
    router.push(`/operaciones/finanzas/bancos/${bank.id}/extracto?month=${m}&year=${y}`);
  }

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - i);

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6 md:p-8 print:p-0 print:bg-white print:text-black">
      
      {/* Botones y Filtros (Ocultos en impresión) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <Link 
            href="/operaciones/finanzas/bancos"
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => handleFilterChange(e, 'month')}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => handleFilterChange(e, 'year')}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold px-6 py-2.5 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir Extracto
        </button>
      </div>

      <div className="space-y-8">
        {/* Cabecera del Extracto (Aparece en pantalla y PDF) */}
        <div className="border-b border-zinc-800 print:border-gray-300 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 print:text-black mb-2 flex items-center gap-2">
                <Building2 className="w-8 h-8 text-emerald-500 print:hidden" />
                Extracto Bancario
              </h1>
              <div className="text-zinc-400 print:text-gray-600 mt-4 space-y-1">
                <p><span className="font-semibold text-zinc-300 print:text-gray-800">Banco/Entidad:</span> {bank.bankName}</p>
                <p><span className="font-semibold text-zinc-300 print:text-gray-800">Titular de Cuenta:</span> {bank.accountName}</p>
                <p><span className="font-semibold text-zinc-300 print:text-gray-800">Nro de Cuenta:</span> {bank.accountNumber}</p>
                <p><span className="font-semibold text-zinc-300 print:text-gray-800">Moneda:</span> {bank.currency.code} ({bank.currency.symbol})</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-zinc-500 print:text-gray-500 mb-1">Período de Extracto</p>
              <p className="text-xl font-medium text-zinc-200 print:text-black">
                {months[selectedMonth]} {selectedYear}
              </p>
              
              <div className="mt-6 p-4 bg-zinc-900/50 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-xl inline-block text-left">
                <p className="text-xs text-zinc-500 print:text-gray-500 uppercase">Saldo Total (Al Día)</p>
                <p className="text-2xl font-bold text-emerald-400 print:text-black mt-1">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla del Extracto */}
        <div className="bg-zinc-900/40 print:bg-white rounded-xl border border-zinc-800/50 print:border-gray-300 overflow-hidden print:overflow-visible print:break-inside-auto">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-900/80 print:bg-gray-100 border-b border-zinc-800/50 print:border-gray-300 text-zinc-400 print:text-gray-700">
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Concepto / Ref</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-right text-rose-500/80 print:text-rose-600">Débito (-)</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-right text-emerald-500/80 print:text-emerald-600">Crédito (+)</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 print:divide-gray-200">
                {/* Fila de Saldo Anterior */}
                <tr className="bg-zinc-800/20 print:bg-gray-50/50 font-medium">
                  <td className="px-6 py-4 text-zinc-500 print:text-gray-500">-</td>
                  <td className="px-6 py-4 text-zinc-400 print:text-gray-700 uppercase">SALDO ANTERIOR</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-zinc-200 print:text-black font-bold">
                    {formatCurrency(previousBalance)}
                  </td>
                </tr>

                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 print:text-gray-500 italic">
                      No hay movimientos en este período.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const hasPayments = row.payablePayments && row.payablePayments.length > 0;
                    const isExpanded = expandedRows.has(row.id);

                    return (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-3 text-zinc-300 print:text-black whitespace-nowrap">
                            {format(new Date(row.date), "dd/MM/yyyy", { locale: es })}
                          </td>
                          <td className="px-6 py-3 text-zinc-300 print:text-gray-800">
                            <div className="flex items-center gap-2">
                              {hasPayments && (
                                <button 
                                  onClick={() => toggleRow(row.id)}
                                  className="text-zinc-400 hover:text-emerald-400 print:hidden transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              <span>
                                {row.concept}
                                {row.reference && <span className="text-zinc-500 text-xs ml-2">({row.reference})</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-rose-400 print:text-rose-600 font-medium">
                            {row.type === "EXPENSE" ? formatCurrency(row.amount) : ""}
                          </td>
                          <td className="px-6 py-3 text-right text-emerald-400 print:text-emerald-600 font-medium">
                            {row.type === "INCOME" ? formatCurrency(row.amount) : ""}
                          </td>
                          <td className="px-6 py-3 text-right text-zinc-100 print:text-black font-bold">
                            {formatCurrency(row.runningBalance)}
                          </td>
                        </tr>
                        {hasPayments && isExpanded && (
                          <tr className="bg-zinc-900/50 print:bg-gray-50">
                            <td colSpan={5} className="px-12 py-3 border-l-2 border-emerald-500">
                              <div className="text-sm">
                                <p className="text-zinc-400 font-semibold mb-2">Detalle de Gastos Pagados:</p>
                                <ul className="space-y-1">
                                  {row.payablePayments.map((pp: any) => (
                                    <li key={pp.id} className="flex justify-between text-zinc-300 print:text-gray-700 max-w-lg border-b border-zinc-800/50 print:border-gray-200 pb-1">
                                      <span>
                                        {pp.accountPayable.type === "BATCH_PURCHASE" ? "Lote" : "Gasto"} - {pp.accountPayable.provider.legalName}
                                      </span>
                                      <span className="font-mono text-rose-300 print:text-rose-600">
                                        {formatCurrency(pp.amount)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-900/80 print:bg-gray-100 border-t-2 border-zinc-800 print:border-gray-300 font-bold">
                    <td colSpan={2} className="px-6 py-4 text-right text-zinc-300 print:text-gray-800 uppercase text-xs">
                      Saldo a fin del período:
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-right text-zinc-100 print:text-black text-lg">
                      {formatCurrency(rows[rows.length - 1].runningBalance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        
        <div className="mt-12 text-center text-zinc-500 print:text-gray-500 text-xs pb-8 print:pb-0">
          Documento generado por Sistema FFH. Este extracto es de carácter informativo.
        </div>
      </div>
    </div>
  );
}
