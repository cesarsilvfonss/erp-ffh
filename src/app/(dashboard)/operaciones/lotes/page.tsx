import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Search, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const batches = await prisma.batch.findMany({
    include: { provider: true, details: true },
    orderBy: { createdAt: "desc" },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN": return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs font-medium border border-blue-500/20">ABIERTO</span>;
      case "IN_SLAUGHTER": return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md text-xs font-medium border border-amber-500/20">EN FAENA</span>;
      case "CLOSED": return <span className="px-2 py-1 bg-zinc-500/10 text-zinc-400 rounded-md text-xs font-medium border border-zinc-500/20">CERRADO</span>;
      default: return <span className="px-2 py-1 bg-zinc-500/10 text-zinc-400 rounded-md text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Lotes de Ganado</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de compras, romaneo y faena.</p>
        </div>
        <Link 
          href="/operaciones/lotes/nuevo"
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Lote
        </Link>
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
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Cabezas</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {batches.map((batch) => {
                const totalHeads = batch.details.reduce((acc, d) => acc + d.quantity, 0);
                
                return (
                  <tr key={batch.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-100">
                      #{batch.batchNumber.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4">{new Date(batch.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{batch.provider.legalName}</td>
                    <td className="px-6 py-4">{totalHeads}</td>
                    <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/operaciones/lotes/${batch.id}`}
                        className="inline-flex p-1.5 text-zinc-400 hover:text-emerald-400 rounded-md hover:bg-emerald-400/10 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {batches.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No se encontraron lotes registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
