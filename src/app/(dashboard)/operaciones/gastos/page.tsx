import { prisma } from "@/lib/prisma";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: {
      category: true,
      provider: true,
      batch: true,
    }
  });

  const totalGastos = expenses.reduce((acc, g) => acc + g.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Gastos Operativos</h1>
          <p className="text-zinc-400 text-sm mt-1">Registro y seguimiento de gastos por lote y generales.</p>
        </div>
        <Link 
          href="/operaciones/gastos/nuevo"
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Registrar Gastos
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-400 mb-1">Total Gastos Registrados</p>
          <p className="text-3xl font-bold text-rose-400">₲ {totalGastos.toLocaleString()}</p>
        </div>
        {/* Aquí se pueden agregar más widgets de resumen en el futuro */}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar gasto, proveedor o lote..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Proveedor</th>
                <th className="px-6 py-3 font-medium">Lote Asociado</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="px-6 py-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-200">
                    {exp.category.name}
                  </td>
                  <td className="px-6 py-4">
                    {exp.provider.legalName}
                  </td>
                  <td className="px-6 py-4">
                    {exp.batch ? (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs">
                        Lote #{exp.batch.batchNumber}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic text-xs">General</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-rose-400">
                    ₲ {exp.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay gastos registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
