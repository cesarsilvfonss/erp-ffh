import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { SlaughterForm } from "./SlaughterForm";

export const dynamic = "force-dynamic";

export default async function FaenaDetailsPage({ params }: { params: { batchId: string } }) {
  const batch = await prisma.batch.findUnique({
    where: { id: params.batchId },
    include: {
      provider: true,
      details: true,
      closure: true,
      slaughter: {
        include: { details: true }
      }
    },
  });

  if (!batch || !batch.closure) return notFound();

  // Agrupar peso vivo por categoría para mostrar
  const liveWeights: Record<string, number> = {};
  const headsCount: Record<string, number> = {};
  
  batch.details.forEach(d => {
    liveWeights[d.category] = (liveWeights[d.category] || 0) + d.netWeight;
    headsCount[d.category] = (headsCount[d.category] || 0) + d.quantity;
  });

  const categories = Object.keys(liveWeights);
  const isDone = !!batch.slaughter;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/operaciones/faena"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Faena del Lote #{batch.batchNumber.toString().padStart(4, '0')}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {batch.provider.legalName} | Cierre original: {batch.closure.totalNetWeight} KG Brutos
          </p>
        </div>
      </div>

      {isDone ? (
        <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-xl overflow-hidden">
          <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-emerald-400">Faena Registrada y Costeada Exitosamente</h2>
          </div>
          <div className="p-6">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3 text-right">Peso Vivo</th>
                  <th className="pb-3 text-right">Peso Gancho</th>
                  <th className="pb-3 text-right">Rendimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-200">
                {batch.slaughter!.details.map(d => (
                  <tr key={d.id}>
                    <td className="py-3 font-medium">{d.category}</td>
                    <td className="py-3 text-right">{liveWeights[d.category]?.toLocaleString()} KG</td>
                    <td className="py-3 text-right text-emerald-400 font-medium">{d.slaughteredWeight.toLocaleString()} KG</td>
                    <td className="py-3 text-right">{d.yield?.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
              <Link 
                href="/inventario"
                className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
              >
                Ir a ver el inventario valorizado &rarr;
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-100 mb-6">Registro de Pesos al Gancho</h2>
          <SlaughterForm 
            batchId={batch.id} 
            categories={categories} 
            liveWeights={liveWeights} 
          />
        </div>
      )}
    </div>
  );
}
