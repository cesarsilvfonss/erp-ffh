import { prisma } from "@/lib/prisma";
import { Search, Edit2, Trash2 } from "lucide-react";
import { CreateItemModal } from "@/components/items/CreateItemModal";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Catálogo de Artículos</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de productos para la venta e inventario.</p>
        </div>
        <CreateItemModal />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por código o nombre..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Artículo</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Unidad</th>
                <th className="px-6 py-3 font-medium text-right">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-zinc-400">{item.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-100">{item.name}</div>
                    {item.description && <div className="text-xs text-zinc-500 truncate max-w-[200px]">{item.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{item.unit}</td>
                  <td className="px-6 py-4 text-right">
                    {item.status ? (
                      <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Inactivo
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
          {items.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay artículos registrados. ¡Crea el primero!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
