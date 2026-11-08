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

  // Lotes de compras de hacienda (sourceId = batchId)
  const batchIds = payables.filter(p => p.type === 'BATCH_PURCHASE').map(p => p.sourceId);
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    select: { id: true, batchNumber: true }
  });

  const payablesWithDetails = payables.map(p => {
    if (p.type === 'EXPENSE') {
      const exp = expenses.find(e => e.id === p.sourceId);
      return { ...p, expenseDetail: exp, batchNumber: exp?.batch?.batchNumber ?? null };
    }
    if (p.type === 'BATCH_PURCHASE') {
      const b = batches.find(x => x.id === p.sourceId);
      return { ...p, batchNumber: b?.batchNumber ?? null };
    }
    return { ...p, batchNumber: null };
  });

  // Primero lo pendiente (por vencimiento más próximo) y después lo pagado (más reciente primero)
  payablesWithDetails.sort((a, b) => {
    const aPaid = a.status === 'PAID' ? 1 : 0;
    const bPaid = b.status === 'PAID' ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return aPaid ? -diff : diff;
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
