"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Printer, Calendar, ArrowLeft, Beef, TrendingUp, AlertTriangle, FileText, DollarSign, Store } from "lucide-react";

export function LotReportClient({ allBatches, reportData }: { allBatches: any[], reportData: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBatchId = searchParams.get("batchId") || "";

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(amount);
  }

  function handlePrint() {
    window.print();
  }

  function handleBatchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val) {
      router.push(`/operaciones/lotes/reporte?batchId=${val}`);
    } else {
      router.push(`/operaciones/lotes/reporte`);
    }
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6 md:p-8 print:p-0 print:bg-white print:text-black">
      
      {/* Botones de acción y selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <select 
            value={currentBatchId}
            onChange={handleBatchChange}
            className="w-full sm:w-96 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">-- Seleccione un Lote para Reporte --</option>
            {allBatches.map(b => (
              <option key={b.id} value={b.id}>
                Lote #{b.batchNumber} - {b.provider?.legalName} ({new Date(b.date).toLocaleDateString("es-PY")})
              </option>
            ))}
          </select>
        </div>
        
        {reportData && (
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold px-6 py-2.5 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir Reporte
          </button>
        )}
      </div>

      {!reportData ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
          Seleccione un lote en el menú superior para ver su trazabilidad y rentabilidad.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Cabecera del Reporte */}
          <div className="border-b border-zinc-800 print:border-gray-300 pb-6">
            <h1 className="text-3xl font-bold text-emerald-400 print:text-black mb-2">
              Reporte de Lote #{reportData.batch.batchNumber}
            </h1>
            <p className="text-zinc-400 print:text-gray-600 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1"><Store className="w-4 h-4" /> Proveedor: {reportData.batch.provider?.legalName}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Fecha: {new Date(reportData.batch.date).toLocaleDateString("es-PY")}</span>
              <span className="flex items-center gap-1">Estado: {reportData.batch.status}</span>
            </p>
          </div>

          {/* Tarjetas de Resumen Operativo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/40 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-xl p-5">
              <h3 className="text-zinc-400 print:text-gray-600 font-medium text-sm flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-emerald-500" /> Inversión (Compra)
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Animales</p>
                  <p className="text-xl font-bold">{reportData.purchase.quantity} cabezas</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Costo Promedio</p>
                  <p className="text-xl font-bold">{formatCurrency(reportData.purchase.avgCost)}/kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Kilaje Vivo Total</p>
                  <p className="text-xl font-bold">{reportData.purchase.weight.toLocaleString("es-PY")} kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase text-emerald-500">Costo Total Compra</p>
                  <p className="text-xl font-bold text-emerald-400 print:text-black">{formatCurrency(reportData.purchase.totalCost)}</p>
                </div>
              </div>

              {reportData.purchase.breakdown?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase mb-2">Desglose por Categoría</p>
                  <div className="space-y-2">
                    {reportData.purchase.breakdown.map((cat: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-300 font-medium">{cat.itemName}</span>
                        <div className="text-right">
                          <span className="text-zinc-400 mr-3">{cat.weight.toLocaleString("es-PY")} kg ({formatCurrency(cat.avgCost)}/kg)</span>
                          <span className="font-bold text-emerald-400/80">{formatCurrency(cat.totalCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/40 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-xl p-5">
              <h3 className="text-zinc-400 print:text-gray-600 font-medium text-sm flex items-center gap-2 mb-4">
                <Beef className="w-4 h-4 text-emerald-500" /> Rendimiento de Faena
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Kilos Gancho Producidos</p>
                  <p className="text-xl font-bold">{reportData.slaughter.weight.toLocaleString("es-PY")} kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Rendimiento Estimado</p>
                  <p className="text-xl font-bold text-emerald-400 print:text-black">{reportData.slaughter.performance.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase">Stock en Cámara (Restante)</p>
                  <p className="text-xl font-bold">{reportData.inventory.stockKg.toLocaleString("es-PY")} kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase text-amber-500">Valor Stock Cámara</p>
                  <p className="text-xl font-bold text-amber-400 print:text-black">{formatCurrency(reportData.inventory.stockValue)}</p>
                </div>
              </div>

              {reportData.slaughter.breakdown?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <p className="text-zinc-500 print:text-gray-500 text-xs uppercase mb-2">Desglose por Categoría</p>
                  <div className="space-y-2">
                    {reportData.slaughter.breakdown.map((cat: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-300 font-medium">{cat.itemName}</span>
                        <div className="text-right">
                          <span className="font-bold text-zinc-200 mr-3">{cat.weight.toLocaleString("es-PY")} kg gancho</span>
                          <span className="text-emerald-400/80 font-bold">{cat.rendimiento.toFixed(2)}% rend</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cuadro Financiero Principal */}
          <div className="bg-emerald-500/5 print:bg-white border border-emerald-500/20 print:border-gray-300 rounded-xl p-6 overflow-hidden print:overflow-visible">
            <h3 className="text-emerald-500 font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Liquidación Realizada del Lote
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50 print:border-gray-200">
                <span className="text-zinc-300 print:text-gray-700 font-medium">Ingresos por Ventas (Solo Facturado)</span>
                <span className="text-lg font-bold text-emerald-400 print:text-black">{formatCurrency(reportData.sales.revenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50 print:border-gray-200">
                <span className="text-zinc-300 print:text-gray-700 font-medium">(-) Costo de Mercadería Vendida (Costo Carne)</span>
                <span className="text-lg font-bold text-rose-400 print:text-black">-{formatCurrency(reportData.sales.costOfGoods)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50 print:border-gray-200 bg-zinc-900/30 print:bg-gray-50 p-2 rounded">
                <span className="text-zinc-200 print:text-black font-bold">(=) Resultado Bruto de Operación</span>
                <span className="text-xl font-black text-emerald-500 print:text-black">{formatCurrency(reportData.results.grossResult)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50 print:border-gray-200 mt-4">
                <span className="text-zinc-400 print:text-gray-700">(-) Mermas de Cámara ({reportData.inventory.mermasKg} kg)</span>
                <span className="text-rose-400/80 font-medium">-{formatCurrency(reportData.inventory.mermasCost)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50 print:border-gray-200">
                <span className="text-zinc-400 print:text-gray-700">(-) Gastos Operativos Asignados</span>
                <span className="text-rose-400/80 font-medium">-{formatCurrency(reportData.expenses.total)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <span className="text-xl font-black text-white print:text-black">RESULTADO NETO LÍQUIDO</span>
                <div className="text-right">
                  <div className={`text-3xl font-black ${reportData.results.netResult >= 0 ? "text-emerald-400" : "text-rose-500"} print:text-black`}>
                    {formatCurrency(reportData.results.netResult)}
                  </div>
                  {reportData.purchase.totalCost > 0 && (
                    <div className={`text-lg font-bold mt-1 ${reportData.results.netResult >= 0 ? "text-emerald-400/80" : "text-rose-500/80"}`}>
                      % Utilidad sobre la compra: {((reportData.results.netResult / reportData.purchase.totalCost) * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 print:text-gray-500 mt-4 italic">
              * El Resultado Neto refleja únicamente la ganancia materializada sobre la carne ya vendida, descontando todos los gastos y mermas totales del lote. El remanente en cámara ({formatCurrency(reportData.inventory.stockValue)}) representa rentabilidad potencial futura.
            </p>
          </div>

          {/* Detalles Tabulares */}
          <div className="grid grid-cols-1 gap-8 print:gap-12">
            
            {/* Gastos */}
            <div className="bg-zinc-900/40 print:bg-white rounded-xl border border-zinc-800/50 print:border-gray-300 overflow-hidden print:overflow-visible print:break-inside-auto">
              <div className="p-4 bg-zinc-800/50 print:bg-gray-100 border-b border-zinc-800/50 print:border-gray-300 flex items-center justify-between">
                <h4 className="font-bold text-zinc-200 print:text-black flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Detalle de Gastos</h4>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-zinc-900/20 print:bg-gray-50 text-zinc-400 print:text-gray-600">
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Categoría</th>
                      <th className="px-4 py-3 font-semibold">Concepto / Ref</th>
                      <th className="px-4 py-3 font-semibold text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 print:divide-gray-200">
                    {reportData.expenses.list.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No hay gastos asignados a este lote.</td></tr>
                    )}
                    {reportData.expenses.list.map((e: any) => (
                      <tr key={e.id}>
                        <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("es-PY")}</td>
                        <td className="px-4 py-3">{e.category.name}</td>
                        <td className="px-4 py-3">{e.description || "-"}</td>
                        <td className="px-4 py-3 text-right text-rose-400">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ventas */}
            <div className="bg-zinc-900/40 print:bg-white rounded-xl border border-zinc-800/50 print:border-gray-300 overflow-hidden print:overflow-visible print:break-inside-auto">
              <div className="p-4 bg-zinc-800/50 print:bg-gray-100 border-b border-zinc-800/50 print:border-gray-300 flex items-center justify-between">
                <h4 className="font-bold text-zinc-200 print:text-black flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500"/> Historial de Ventas</h4>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-zinc-900/20 print:bg-gray-50 text-zinc-400 print:text-gray-600">
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Nro Factura</th>
                      <th className="px-4 py-3 font-semibold">Cliente</th>
                      <th className="px-4 py-3 font-semibold text-right">Cant. (Kg)</th>
                      <th className="px-4 py-3 font-semibold text-right">Precio Prom.</th>
                      <th className="px-4 py-3 font-semibold text-right">Total Venta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 print:divide-gray-200">
                    {reportData.sales.list.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No se han registrado ventas de este lote aún.</td></tr>
                    )}
                    {reportData.sales.list.map((s: any) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3">{new Date(s.date).toLocaleDateString("es-PY")}</td>
                        <td className="px-4 py-3 font-medium">{s.invoiceNumber || "S/N"}</td>
                        <td className="px-4 py-3">{s.clientName}</td>
                        <td className="px-4 py-3 text-right">{s.quantity.toLocaleString("es-PY")}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(s.price)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">{formatCurrency(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-800/30 print:bg-gray-100 font-bold text-zinc-200 print:text-black">
                      <td colSpan={3} className="px-4 py-3 text-right">Totales Realizados:</td>
                      <td className="px-4 py-3 text-right">{reportData.sales.totalKg.toLocaleString("es-PY")} Kg</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right text-emerald-500">{formatCurrency(reportData.sales.revenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
          
          <div className="mt-12 text-center text-zinc-500 print:text-gray-500 text-xs pb-8 print:pb-0">
            Reporte generado automáticamente por Sistema FFH.
          </div>
        </div>
      )}
    </div>
  );
}
