import { prisma } from "@/lib/prisma";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { CreateCategoryModal } from "@/components/expenses/CreateCategoryModal";

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage() {
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Categorías de Gastos</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de rubros pre-registrados para cargar gastos operativos.</p>
        </div>
        <CreateCategoryModal />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Categoría</th>
              <th className="px-6 py-3 font-medium">Descripción</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-100">{cat.name}</td>
                <td className="px-6 py-4 text-zinc-400">{cat.description || "-"}</td>
                <td className="px-6 py-4">
                  {cat.isActive ? (
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
        {categories.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            No hay categorías registradas. ¡Crea la primera!
          </div>
        )}
      </div>
    </div>
  );
}
