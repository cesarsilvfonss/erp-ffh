import { prisma } from "@/lib/prisma";
import { BulkExpenseForm } from "./BulkExpenseForm";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    include: { provider: true },
    where: { status: { not: "CLOSED" } }, // maybe just active ones, but let's allow all for now. Actually, any batch.
  });

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  const providers = await prisma.provider.findMany({
    orderBy: { legalName: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Registrar Gastos Masivos</h1>
        <p className="text-zinc-400 text-sm mt-1">Carga múltiples gastos asociados a un mismo lote (fletes, comisiones, honorarios).</p>
      </div>

      <BulkExpenseForm 
        batches={batches} 
        categories={categories} 
        providers={providers} 
      />
    </div>
  );
}
