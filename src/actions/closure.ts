"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createOrUpdateClosure(year: number, month: number, isFinalClose = false, userId?: string) {
  // Calcular saldos EN VIVO
  // 1. Bank Balance
  const bankAccounts = await prisma.bankAccount.findMany({
    include: { transactions: true }
  });
  let bankBalance = 0;
  bankAccounts.forEach(account => {
    let accountBalance = account.initialBalance;
    account.transactions.forEach(tx => {
      if (tx.type === 'INCOME') accountBalance += tx.amount;
      else accountBalance -= tx.amount;
    });
    bankBalance += accountBalance;
  });

  // 2. Checks in Portfolio
  const checks = await prisma.check.findMany({
    where: { status: "IN_PORTFOLIO" }
  });
  const checksBalance = checks.reduce((acc, c) => acc + c.amount, 0);

  // 3. Client Balance (AccountReceivable no pagados al 100%)
  const receivables = await prisma.accountReceivable.findMany({
    where: { status: { not: "PAID" } }
  });
  const clientBalance = receivables.reduce((acc, r) => acc + (r.amount - r.paidAmount), 0);

  // 4. Supplier Balance (AccountPayable no pagados al 100%)
  const payables = await prisma.accountPayable.findMany({
    where: { status: { not: "PAID" } }
  });
  const supplierBalance = payables.reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);

  // 5. Stock Value
  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { currentStock: { gte: 0.2 } }
  });
  const stockValue = inventoryLots.reduce((acc, lot) => acc + (lot.currentStock * lot.unitCost), 0);

  // 6. Total Capital
  const totalCapital = bankBalance + checksBalance + clientBalance + stockValue - supplierBalance;

  // Upsert the closure
  const closure = await prisma.monthlyClosure.upsert({
    where: {
      year_month: { year, month }
    },
    update: {
      bankBalance,
      checksBalance,
      clientBalance,
      supplierBalance,
      stockValue,
      totalCapital,
      status: isFinalClose ? "CLOSED" : "DRAFT",
      closedAt: isFinalClose ? new Date() : undefined,
      closedById: userId,
    },
    create: {
      year,
      month,
      bankBalance,
      checksBalance,
      clientBalance,
      supplierBalance,
      stockValue,
      totalCapital,
      status: isFinalClose ? "CLOSED" : "DRAFT",
      closedAt: isFinalClose ? new Date() : undefined,
      closedById: userId,
    }
  });

  revalidatePath("/operaciones/finanzas/cierre-mensual");
  return { success: true, data: closure };
}

export async function reopenClosure(year: number, month: number, userId: string) {
  // Only ADMIN can do this, but we'll assume auth check is done in the route or UI component
  await prisma.monthlyClosure.update({
    where: { year_month: { year, month } },
    data: { status: "DRAFT", closedAt: null, closedById: null }
  });
  revalidatePath("/operaciones/finanzas/cierre-mensual");
  return { success: true };
}

export async function getLiveCapital() {
  // Similar logic as above just to read live state without saving
  const bankAccounts = await prisma.bankAccount.findMany({ include: { transactions: true } });
  let bankBalance = 0;
  bankAccounts.forEach(account => {
    let ab = account.initialBalance;
    account.transactions.forEach(tx => {
      if (tx.type === 'INCOME') ab += tx.amount;
      else ab -= tx.amount;
    });
    bankBalance += ab;
  });

  const checks = await prisma.check.findMany({ where: { status: "IN_PORTFOLIO" } });
  const checksBalance = checks.reduce((acc, c) => acc + c.amount, 0);

  const receivables = await prisma.accountReceivable.findMany({ where: { status: { not: "PAID" } } });
  const clientBalance = receivables.reduce((acc, r) => acc + (r.amount - r.paidAmount), 0);

  const payables = await prisma.accountPayable.findMany({ where: { status: { not: "PAID" } } });
  const supplierBalance = payables.reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);

  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { currentStock: { gte: 0.2 } }
  });
  const stockValue = inventoryLots.reduce((acc, lot) => acc + (lot.currentStock * lot.unitCost), 0);

  const totalCapital = bankBalance + checksBalance + clientBalance + stockValue - supplierBalance;

  return {
    bankBalance,
    checksBalance,
    clientBalance,
    supplierBalance,
    stockValue,
    totalCapital
  };
}
