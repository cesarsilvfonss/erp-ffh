import { prisma } from "@/lib/prisma";
import { PayableList } from "./PayableList";

export const dynamic = "force-dynamic";

export default async function CuentasPagarPage() {
  const payables = await prisma.accountPayable.findMany({
    include: { provider: true },
    orderBy: { dueDate: "asc" }
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { status: true },
    include: { currency: true }
  });

  const expenseIds = payables.filter(p => p.type === 'EXPENSE').map(p => p.sourceId);
  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds } },
    include: { category: true, batch: true }
  });

  const payablesWithDetails = payables.map(p => {
    if (p.type === 'EXPENSE') {
      const exp = expenses.find(e => e.id === p.sourceId);
      return { ...p, expenseDetail: exp };
    }
    return p;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Cuentas por Pagar</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestión de pagos a proveedores, faena, y préstamos.</p>
      </div>

      <PayableList payables={payablesWithDetails} bankAccounts={bankAccounts} />
    </div>
  );
}
