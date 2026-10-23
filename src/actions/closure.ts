"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOpenPeriod, getLastClosure } from "@/lib/closure";
import { todayPY, endOfDayPY, formatDatePY } from "@/lib/dates";

/**
 * Cierra el período abierto. El cierre NO es por mes reloj: cubre desde el
 * inicio del período abierto hasta las 23:59:59.999 (hora Asunción) del día
 * en que se presiona CERRAR. El nuevo período comienza a las 00:00:00 del
 * día siguiente.
 */
export async function closePeriod() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "ADMINISTRATION")) {
      return { success: false, error: "No autorizado" };
    }

    const today = todayPY();
    const { lastClosure, start, previousCapital } = await getOpenPeriod();

    if (lastClosure && lastClosure.closingDate >= today) {
      return { success: false, error: `El día ${formatDatePY(lastClosure.periodEnd)} ya se encuentra cerrado. El próximo cierre podrá hacerse a partir de mañana.` };
    }

    const live = await getLiveCapital();

    const closure = await prisma.monthlyClosure.create({
      data: {
        closingDate: today,
        periodStart: start,
        periodEnd: endOfDayPY(today),
        status: "CLOSED",
        closedAt: new Date(),
        closedById: session.user.id,
        previousCapital,
        ...live,
      },
    });

    revalidatePath("/operaciones/finanzas/cierre-mensual");
    revalidatePath("/");
    return { success: true, data: closure };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Re-abre el ÚLTIMO cierre (solo ADMIN). No se pueden re-abrir cierres intermedios. */
export async function reopenLastClosure() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Solo el Administrador puede re-abrir un período" };
    }

    const last = await getLastClosure();
    if (!last) return { success: false, error: "No hay períodos cerrados" };

    await prisma.monthlyClosure.update({
      where: { id: last.id },
      data: { status: "REOPENED" },
    });

    revalidatePath("/operaciones/finanzas/cierre-mensual");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLiveCapital() {
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

  const liveStockClosures = await prisma.batchClosure.findMany({
    where: {
      batch: {
        inventoryLots: { none: {} },
        isLiveSale: false
      }
    }
  });
  const liveStockValue = liveStockClosures.reduce((acc, closure) => acc + closure.totalValue, 0);

  const totalCapital = bankBalance + checksBalance + clientBalance + stockValue + liveStockValue - supplierBalance;

  return {
    bankBalance,
    checksBalance,
    clientBalance,
    supplierBalance,
    stockValue,
    liveStockValue,
    totalCapital
  };
}
