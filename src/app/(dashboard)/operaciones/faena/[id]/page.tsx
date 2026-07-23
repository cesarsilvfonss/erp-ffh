import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { FaenaForm } from "./FaenaForm";
import { CloseFaenaButton } from "@/components/faena/CloseFaenaButton";
import { AnimalCategory } from "@prisma/client";

import { GenerateFaenaPdfButton } from "@/components/faena/GenerateFaenaPdfButton";

export const dynamic = "force-dynamic";

export default async function FaenaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const slaughter = await prisma.slaughter.findUnique({
    where: { id },
    include: {
      batch: {
        include: {
          provider: true,
          details: true
        }
      },
      details: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!slaughter) return notFound();

  const isOpen = slaughter.status === "OPEN";

  // Calcular totales del Lote (Compra)
  const totalBoughtHeads = slaughter.batch.details.reduce((acc, d) => acc + d.quantity, 0);
  const totalBoughtWeight = slaughter.batch.details.reduce((acc, d) => acc + d.netWeight, 0);

  // Agrupar por categoría en la compra
  const boughtStats = slaughter.batch.details.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = { heads: 0, weight: 0 };
    acc[d.category].heads += d.quantity;
    acc[d.category].weight += d.netWeight;
    return acc;
  }, {} as Record<string, { heads: number, weight: number }>);

  // Agrupar por categoría en faena (cada línea = 0.5 cabeza)
  const faenaStats = slaughter.details.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = { heads: 0, weight: 0 };
    acc[d.category].heads += 0.5; // Media res
    acc[d.category].weight += d.weight;
    return acc;
  }, {} as Record<string, { heads: number, weight: number }>);

  const totalFaenaHeads = slaughter.details.length * 0.5;
  const totalFaenaWeight = slaughter.details.reduce((acc, d) => acc + d.weight, 0);

  // Categorías presentes en la compra (para pasarlas al form)
  const availableCategories = Object.keys(boughtStats) as AnimalCategory[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/operaciones/faena"
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Faena - Lote #{slaughter.batch.batchNumber}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Proveedor: {slaughter.batch.provider.legalName}
            </p>
          </div>
        </div>

        {isOpen ? (
          <CloseFaenaButton 
            slaughterId={slaughter.id} 
            totalBoughtHeads={totalBoughtHeads}
            totalFaenaHeads={totalFaenaHeads}
            disabled={slaughter.details.length === 0}
          />
        ) : (
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 text-zinc-300 rounded-lg border border-zinc-700/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Faena Cerrada</span>
            </div>
            <GenerateFaenaPdfButton slaughter={slaughter} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQ: RESUMEN DE AVANCE */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
              <h2 className="font-semibold text-zinc-100">Avance de Faena</h2>
            </div>
            <div className="p-4">
              
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-zinc-400">Total Cabezas</span>
                  <span className="text-2xl font-bold text-emerald-400">{totalFaenaHeads} <span className="text-sm font-normal text-zinc-500">/ {totalBoughtHeads}</span></span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (totalFaenaHeads / totalBoughtHeads) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase text-zinc-500">Desglose por Categoría</h3>
                {availableCategories.map(cat => {
                  const bHeads = boughtStats[cat]?.heads || 0;
                  const fHeads = faenaStats[cat]?.heads || 0;
                  const fWeight = faenaStats[cat]?.weight || 0;
                  const bWeight = boughtStats[cat]?.weight || 0;
                  const progress = (fHeads / bHeads) * 100 || 0;
                  const yieldPercent = bWeight > 0 ? (fWeight / bWeight) * 100 : 0;

                  return (
                    <div key={cat} className="bg-zinc-950 border border-zinc-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-zinc-300">{cat}</span>
                        <span className="text-sm text-zinc-100">{fHeads} / {bHeads} cbz</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                        <div 
                          className={`h-1.5 rounded-full ${progress > 100 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Gancho: {fWeight.toLocaleString()} kg</span>
                        <span className="text-emerald-500/80">Rend: {yieldPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        {/* COLUMNA DER: FORMULARIO Y TABLA */}
        <div className="lg:col-span-2 space-y-6">
          {isOpen && (
            <FaenaForm 
              slaughterId={slaughter.id} 
              availableCategories={availableCategories} 
            />
          )}

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
              <h2 className="font-semibold text-zinc-100">Registros de Medias Reses</h2>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Total: {slaughter.details.length} líneas</span>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-sm relative">
                <thead className="bg-zinc-950 text-zinc-400 sticky top-0 shadow-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Condición</th>
                    <th className="px-4 py-3 font-medium text-right">Peso (KG)</th>
                    <th className="px-4 py-3 font-medium text-right">Hora</th>
                    {isOpen && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {slaughter.details.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{d.sequenceNumber}</td>
                      <td className="px-4 py-2 font-medium">{d.category}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          d.condition === 'CON_COBERTURA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          d.condition === 'SIN_COBERTURA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          d.condition === 'FLACO' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {d.condition.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-400">{d.weight}</td>
                      <td className="px-4 py-2 text-right text-xs text-zinc-500">
                        {new Date(d.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      {isOpen && (
                        <td className="px-4 py-2 text-right">
                          <form action={async () => {
                            "use server"
                            const { deleteFaenaDetail } = await import("@/actions/faena");
                            await deleteFaenaDetail(d.id, slaughter.id);
                          }}>
                            <button className="text-zinc-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-rose-500/10">
                              Eliminar
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  {slaughter.details.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No hay medias reses registradas. Usa el formulario de arriba para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
