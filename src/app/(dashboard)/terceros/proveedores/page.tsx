import { prisma } from "@/lib/prisma";
import { Search, Edit2, Trash2 } from "lucide-react";
import { CreateProviderModal } from "@/components/providers/CreateProviderModal";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const proveedores = await prisma.provider.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Proveedores</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de proveedores de ganado y servicios.</p>
        </div>
        <CreateProviderModal />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por nombre o contacto..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">RUC</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Contacto</th>
                <th className="px-6 py-3 font-medium">Teléfono / Email</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {proveedores.map((prov) => (
                <tr key={prov.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-zinc-400">{prov.ruc}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-100 flex items-center gap-2">
                      {prov.legalName}
                      {prov.isSlaughterhouse && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Frigorífico
                        </span>
                      )}
                    </div>
                    {prov.tradeName && <div className="text-xs text-zinc-500">{prov.tradeName}</div>}
                    {prov.address && <div className="text-xs text-zinc-600 mt-1">{prov.address}</div>}
                  </td>
                  <td className="px-6 py-4">{prov.contact || "-"}</td>
                  <td className="px-6 py-4">
                    <div>{prov.phone || "-"}</div>
                    <div className="text-xs text-zinc-500">{prov.email}</div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-md hover:bg-cyan-400/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {proveedores.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay proveedores registrados. ¡Crea el primero!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
