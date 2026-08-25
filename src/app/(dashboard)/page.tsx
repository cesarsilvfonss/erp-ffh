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

  // 3. Ventas del Mes y Costo de Ventas (COGS)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const salesThisMonthRecords = await prisma.sale.findMany({
    where: { 
      date: { gte: startOfMonth }, 
      status: 'CONFIRMED' 
    },
    include: { details: true }
  });
  
  const salesThisMonth = salesThisMonthRecords.reduce((acc, sale) => acc + sale.totalValue, 0);
  const costOfSalesThisMonth = salesThisMonthRecords.reduce((acc, sale) => {
    const saleCost = sale.details.reduce((sum, d) => sum + (d.quantityKg * d.costAtSale), 0);
    return acc + saleCost;
  }, 0);
  
  const grossProfit = salesThisMonth - costOfSalesThisMonth;

  // 4. Mermas de Cámara del Mes
  const mermasThisMonthRecords = await prisma.inventoryMovement.findMany({
    where: {
      type: "OUT",
      concept: { startsWith: "MERMA DE CAMARA" },
      createdAt: { gte: startOfMonth }
    },
    include: { inventoryLot: true }
  });
  const mermasThisMonth = mermasThisMonthRecords.reduce((acc, mov) => {
    return acc + (mov.quantity * mov.inventoryLot.unitCost);
  }, 0);

  // 5. Gastos Totales del Mes
  const expensesThisMonthRecords = await prisma.expense.findMany({
    where: { date: { gte: startOfMonth } }
  });
  const expensesThisMonth = expensesThisMonthRecords.reduce((acc, exp) => acc + exp.amount, 0);

  // 5.1 Retenciones Sufridas del Mes
  const retentionsThisMonthRecords = await prisma.payment.findMany({
    where: { 
      method: "RETENTION",
      date: { gte: startOfMonth }
    }
  });
  const retentionsThisMonth = retentionsThisMonthRecords.reduce((acc, p) => acc + p.amount, 0);

  // 6. Rentabilidad Neta
  const netProfit = grossProfit - expensesThisMonth - mermasThisMonth - retentionsThisMonth;

  // 7. Cuentas por Cobrar y Pagar
  const receivablesRecords = await prisma.accountReceivable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const receivables = receivablesRecords.reduce((acc, rec) => acc + (rec.amount - rec.paidAmount), 0);

  const payablesRecords = await prisma.accountPayable.findMany({
    where: { status: { not: 'PAID' } }
  });
  const payables = payablesRecords.reduce((acc, pay) => acc + (pay.amount - pay.paidAmount), 0);

  return (
    <DashboardUI 
      bankBalance={bankBalance}
      inventoryValue={inventoryValue}
      salesThisMonth={salesThisMonth}
      costOfSalesThisMonth={costOfSalesThisMonth}
      grossProfit={grossProfit}
      mermasThisMonth={mermasThisMonth}
      expensesThisMonth={expensesThisMonth}
      retentionsThisMonth={retentionsThisMonth}
      netProfit={netProfit}
      receivables={receivables}
      payables={payables}
    />
  );
}
