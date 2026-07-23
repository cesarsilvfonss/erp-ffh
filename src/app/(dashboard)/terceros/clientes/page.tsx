import { prisma } from "@/lib/prisma";
import { Search, Edit2, Trash2, Mail, Phone } from "lucide-react";
import { CreateClientModal } from "@/components/clients/CreateClientModal";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de clientes y condiciones de crédito.</p>
        </div>
        <CreateClientModal />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar cliente..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Contacto</th>
                <th className="px-6 py-3 font-medium">Plazo Crédito</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {clientes.map((cli) => (
                <tr key={cli.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-100">{cli.legalName}</div>
                    {cli.tradeName && <div className="text-xs text-zinc-500">{cli.tradeName}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {cli.contact && <div className="font-medium">{cli.contact}</div>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                      {cli.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {cli.phone}
                        </div>
                      )}
                      {cli.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {cli.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cli.paymentTermDays === 0 ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Contado
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {cli.paymentTermDays} días
                      </span>
                    )}
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
          {clientes.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay clientes registrados. ¡Crea el primero!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
