import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { RomaneoForm } from "./RomaneoForm";
import { CloseBatchButton } from "@/components/batches/CloseBatchButton";
import { BatchDetailActions } from "@/components/batches/BatchDetailActions";

export const dynamic = "force-dynamic";

export default async function BatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        provider: true,
        slaughterhouse: true,
        details: { orderBy: { createdAt: "asc" } },
        closure: {
          include: { prices: true }
        },
      },
    });

    if (!batch) return notFound();

    const totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);
    const totalWeight = batch.details.reduce((acc, d) => acc + d.netWeight, 0);
    const isOpen = batch.status === "OPEN";



    return (
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/operaciones/lotes"
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">
                Lote #{batch.batchNumber.toString().padStart(4, '0')}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Proveedor: {batch.provider.legalName} | Fecha: {new Date(batch.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {isOpen ? (
          <CloseBatchButton 
            batchId={batch.id} 
            batchDetails={batch.details} 
            totalHeads={totalHeads}
            totalWeight={totalWeight}
            disabled={totalHeads === 0}
          />
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 text-zinc-300 rounded-lg border border-zinc-700/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Lote Cerrado</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: ROMANEO */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="font-semibold text-zinc-100">Romaneo (Pesajes)</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">Condición</th>
                      <th className="px-4 py-3 font-medium text-right">Cabezas</th>
                      <th className="px-4 py-3 font-medium text-right">Peso Neto (KG)</th>
                      <th className="px-4 py-3 font-medium text-right">Promedio (KG)</th>
                      {isOpen && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {batch.details.map((d, i) => (
                      <tr key={d.id} className="hover:bg-zinc-800/50">
                        <td className="px-4 py-3">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{d.category}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            d.condition === 'GORDO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            d.condition === 'FLACO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {d.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{d.quantity}</td>
                        <td className="px-4 py-3 text-right">{d.netWeight.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-zinc-500">
                          {d.quantity > 0 ? (d.netWeight / d.quantity).toFixed(1) : 0}
                        </td>
                        {isOpen && (
                          <td className="px-4 py-3">
                            <BatchDetailActions detail={d} batchId={batch.id} />
                          </td>
                        )}
                      </tr>
                    ))}
                    {batch.details.length === 0 && (
                      <tr>
                        <td colSpan={isOpen ? 7 : 6} className="px-4 py-8 text-center text-zinc-500">
                          No hay pesajes registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-zinc-950 font-medium text-zinc-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-zinc-400">Totales:</td>
                      <td className="px-4 py-3 text-right">{totalHeads}</td>
                      <td className="px-4 py-3 text-right">{totalWeight.toLocaleString()} KG</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {totalHeads > 0 ? (totalWeight / totalHeads).toFixed(1) : 0} KG/cab
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {batch.closure && (
              <div className="bg-zinc-900/50 border border-emerald-900/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-emerald-400 font-semibold">Resumen de Liquidación (Cierre)</h3>
                  <Link 
                    href={`/operaciones/lotes/${batch.id}/imprimir`}
                    target="_blank"
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg border border-zinc-700 transition-colors flex items-center gap-2"
                  >
                    Imprimir Liquidación
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 pb-6 border-b border-emerald-900/30">
                  <div>
                    <p className="text-zinc-500">Peso Bruto</p>
                    <p className="text-zinc-100 font-medium">{batch.closure.totalNetWeight.toLocaleString()} KG</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Desbaste ({batch.closure.discountPercentage}%)</p>
                    <p className="text-rose-400 font-medium">-{batch.closure.totalDiscountWeight.toLocaleString()} KG</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Peso Líquido</p>
                    <p className="text-emerald-400 font-medium">{batch.closure.totalLiquidWeight.toLocaleString()} KG</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Total a Pagar</p>
                    <p className="text-emerald-400 font-bold text-lg">₲ {batch.closure.totalValue.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-3">Desglose de Precios por Categoría</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-zinc-500 border-b border-zinc-800">
                        <tr>
                          <th className="pb-2">Categoría</th>
                          <th className="pb-2 text-right">KG Líquidos</th>
                          <th className="pb-2 text-right">Precio / KG</th>
                          <th className="pb-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {batch.closure.prices.map(p => (
                          <tr key={p.id}>
                            <td className="py-2 text-zinc-300">{p.category}</td>
                            <td className="py-2 text-right text-emerald-400/80">{p.liquidWeight.toLocaleString()} KG</td>
                            <td className="py-2 text-right text-zinc-400">₲ {p.pricePerKg.toLocaleString()}</td>
                            <td className="py-2 text-right font-medium text-emerald-400">₲ {p.totalValue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: FORMULARIO Y RESUMEN */}
          <div className="space-y-6">
            {isOpen && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h2 className="font-semibold text-zinc-100 mb-4">Agregar Pesaje</h2>
                <RomaneoForm batchId={batch.id} />
              </div>
            )}

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h2 className="font-semibold text-zinc-100 mb-4">Información del Lote</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500">Estado</span>
                  <span className="text-zinc-100">{batch.status}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500">Fecha</span>
                  <span className="text-zinc-100">{new Date(batch.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500">Proveedor</span>
                  <span className="text-zinc-100 text-right max-w-[150px] truncate">{batch.provider.legalName}</span>
                </div>
                {batch.slaughterhouse && (
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Frigorífico</span>
                    <span className="text-zinc-100 text-right max-w-[150px] truncate">{batch.slaughterhouse.legalName}</span>
                  </div>
                )}
                {batch.description && (
                  <div className="pt-2">
                    <span className="text-zinc-500 block mb-1">Observaciones</span>
                    <p className="text-zinc-300 italic">{batch.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-rose-500 bg-rose-950/20 rounded-xl border border-rose-900 font-mono">
        <h2 className="font-bold text-xl mb-4">Error Crítico en Servidor:</h2>
        <p className="mb-2"><strong>Message:</strong> {error.message}</p>
        <p className="mb-2"><strong>Name:</strong> {error.name}</p>
        <pre className="text-xs mt-4 text-rose-400 overflow-auto">{error.stack}</pre>
      </div>
    );
  }
}
