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
  const inventoryLots = await prisma.inventoryLot.findMany();
  const inventoryValue = inventoryLots.reduce((acc, lot) => {
    return acc + (lot.currentStock * lot.unitCost);
  }, 0);

  // 3. Ventas del Mes
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const salesThisMonthRecords = await prisma.sale.findMany({
    where: { 
      date: { gte: startOfMonth }, 
      status: 'CONFIRMED' 
    }
  });
  const salesThisMonth = salesThisMonthRecords.reduce((acc, sale) => acc + sale.totalValue, 0);

  // 4. Cuentas por Cobrar
  const receivablesRecords = await prisma.accountReceivable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const receivables = receivablesRecords.reduce((acc, rec) => acc + (rec.amount - rec.paidAmount), 0);

  // 5. Cuentas por Pagar
  const payablesRecords = await prisma.accountPayable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const payables = payablesRecords.reduce((acc, pay) => acc + (pay.amount - pay.paidAmount), 0);

  return (
    <DashboardUI 
      bankBalance={bankBalance}
      inventoryValue={inventoryValue}
      salesThisMonth={salesThisMonth}
      receivables={receivables}
      payables={payables}
    />
  );
}
