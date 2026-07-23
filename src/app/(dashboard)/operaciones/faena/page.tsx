import { prisma } from "@/lib/prisma";
import { ArrowRight, Search, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { InitiateFaenaButton } from "./InitiateFaenaButton";

export const dynamic = "force-dynamic";

export default async function FaenaListPage() {
  // Obtenemos los lotes que tienen estado IN_SLAUGHTER, IN_SALE, CLOSED
  // O que tienen un slaughter asociado
  const slaughters = await prisma.slaughter.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      batch: {
        include: {
          provider: true,
          details: true
        }
      },
      details: true
    }
  });

  const availableBatches = await prisma.batch.findMany({
    where: { 
      status: "CLOSED", // Asumimos que un lote cerrado de compra está listo para faenar
      slaughter: null   // Que no tenga faena iniciada
    },
    include: {
      provider: true,
      details: true
    },
    orderBy: { date: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Módulo de Faena</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestión del romaneo de planta y rendimiento al gancho.</p>
      </div>

      {availableBatches.length > 0 && (
        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl overflow-hidden p-6">
          <h2 className="text-lg font-bold text-emerald-400 mb-4">Lotes Disponibles para Faena</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableBatches.map(batch => {
              const heads = batch.details.reduce((acc, d) => acc + d.quantity, 0);
              return (
                <div key={batch.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-zinc-200">Lote #{batch.batchNumber}</span>
                      <span className="text-xs text-zinc-500">{new Date(batch.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-400 truncate mb-1">Prov: {batch.provider.legalName}</p>
                    <p className="text-sm text-emerald-500/70 font-medium">{heads} Cabezas</p>
                  </div>
                  
                  <InitiateFaenaButton batchId={batch.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por lote o proveedor..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Lote de Origen</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Fecha Faena</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Avance (Cabezas)</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {slaughters.map((slaughter) => {
                const totalBoughtHeads = slaughter.batch.details.reduce((acc, d) => acc + d.quantity, 0);
                const faenadasHeads = slaughter.details.length * 0.5; // Cada línea = 0.5 cabezas
                
                return (
                  <tr key={slaughter.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-200">
                      Lote #{slaughter.batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 truncate max-w-[200px]">
                      {slaughter.batch.provider.legalName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                      {new Date(slaughter.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {slaughter.batch.status === "IN_SLAUGHTER" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-amber-400 bg-amber-400/10 border-amber-400/20">
                          <Clock className="w-3.5 h-3.5" /> En Proceso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finalizado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{faenadasHeads}</span>
                        <span className="text-zinc-500">/ {totalBoughtHeads}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/operaciones/faena/${slaughter.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          slaughter.batch.status === "IN_SLAUGHTER" 
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {slaughter.batch.status === "IN_SLAUGHTER" ? "Continuar" : "Ver Detalle"}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {slaughters.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay faenas registradas. Selecciona un Lote Disponible para comenzar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
