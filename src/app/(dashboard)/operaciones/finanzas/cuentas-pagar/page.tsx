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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Cuentas por Pagar</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestión de pagos a proveedores, faena, y préstamos.</p>
      </div>

      <PayableList payables={payables} bankAccounts={bankAccounts} />
    </div>
  );
}
