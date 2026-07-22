import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ChevronRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FaenaPage() {
  // Lotes listos para faena (CLOSED) o ya faenados (IN_SALE, SOLD)
  const batches = await prisma.batch.findMany({
    where: {
      status: {
        in: ["CLOSED", "IN_SALE", "SOLD"]
      }
    },
    include: { provider: true, details: true, slaughter: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Romaneo de Faena</h1>
          <p className="text-zinc-400 text-sm mt-1">Registra el peso al gancho y calcula rendimientos.</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por Nro Lote, Proveedor..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Lote Nro</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Cabezas (Pie)</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {batches.map((batch) => {
                const totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);
                const isReady = batch.status === "CLOSED";
                const isDone = !!batch.slaughter;

                return (
                  <tr key={batch.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-100">
                      #{batch.batchNumber.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4">{batch.provider.legalName}</td>
                    <td className="px-6 py-4">{totalHeads}</td>
                    <td className="px-6 py-4">
                      {isDone ? (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium border border-emerald-500/20 flex items-center w-fit gap-1">
                          <CheckCircle2 className="w-3 h-3" /> FAENADO
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs font-medium border border-blue-500/20">
                          LISTO PARA FAENA
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isDone ? (
                        <Link 
                          href={`/operaciones/faena/${batch.id}`}
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
                        >
                          Ver Resumen <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <Link 
                          href={`/operaciones/faena/${batch.id}`}
                          className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 px-3 py-1.5 rounded-lg transition-colors font-medium border border-emerald-500/20 hover:border-transparent"
                        >
                          Registrar Faena <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {batches.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay lotes cerrados listos para faena.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
