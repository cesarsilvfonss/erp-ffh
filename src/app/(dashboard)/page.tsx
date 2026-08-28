import { prisma } from "@/lib/prisma";
import { DashboardUI } from "./DashboardUI";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role === "WEIGHER") {
    redirect("/operaciones/faena");
  }
  // 1. Saldo Bancario
  const bankAccounts = await prisma.bankAccount.findMany({
    include: { transactions: true }
  });
  const bankBalance = bankAccounts.reduce((acc, account) => {
    const transactionsSum = account.transactions.reduce((sum, tx) => {
      return tx.type === 'INCOME' ? sum + tx.amount : sum - tx.amount;
    }, 0);
    return acc + account.initialBalance + transactionsSum;
  }, 0);

  // 2. Valor del Inventario
  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { currentStock: { gte: 0.2 } }
  });
  const inventoryValue = inventoryLots.reduce((acc, lot) => {
    return acc + (lot.currentStock * lot.unitCost);
  }, 0);

  // 3. Cheques en Cartera
  const walletChecksRecords = await prisma.check.findMany({
    where: { status: 'IN_PORTFOLIO' }
  });
  const walletChecks = walletChecksRecords.reduce((acc, check) => acc + check.amount, 0);

  // 4. Cuentas por Cobrar y Pagar
  const receivablesRecords = await prisma.accountReceivable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const receivables = receivablesRecords.reduce((acc, rec) => acc + (rec.amount - rec.paidAmount), 0);

  const payablesRecords = await prisma.accountPayable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const payables = payablesRecords.reduce((acc, pay) => acc + (pay.amount - pay.paidAmount), 0);

  // 4.1 Stock en Pie (Lotes cerrados sin faenar y no vendidos en pie)
  const liveStockClosures = await prisma.batchClosure.findMany({
    where: {
      batch: {
        inventoryLots: { none: {} },
        isLiveSale: false
      }
    }
  });
  const liveStockValue = liveStockClosures.reduce((acc, closure) => acc + closure.totalValue, 0);

  // 5. Capital Anterior (Último Cierre)
  const lastClosure = await prisma.monthlyClosure.findFirst({
    where: { status: 'CLOSED' },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  });
  const previousCapital = lastClosure ? lastClosure.totalCapital : 2717386896;

  return (
    <DashboardUI 
      bankBalance={bankBalance}
      inventoryValue={inventoryValue}
      liveStockValue={liveStockValue}
      walletChecks={walletChecks}
      receivables={receivables}
      payables={payables}
      previousCapital={previousCapital}
    />
  );
}
