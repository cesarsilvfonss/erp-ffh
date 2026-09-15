import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ExpenseListClient } from "./ExpenseListClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      include: {
        category: true,
        provider: true,
        batch: true,
      }
    }),
    prisma.expenseCategory.findMany({
      orderBy: { name: "asc" }
    })
  ]);

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

      <ExpenseListClient expenses={expenses} categories={categories} />
    </div>
  );
}
