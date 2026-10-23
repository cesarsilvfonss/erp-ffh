"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOpenPeriod, getLastClosure } from "@/lib/closure";
import { todayPY, endOfDayPY, formatDatePY, dateFromInputPY, startOfDayPY } from "@/lib/dates";
import { computeDistribution, capitalMismatch } from "@/lib/shareholders";
import { loadDistributionInputs, getTotalRetentionBalance } from "@/lib/distribution";

const SALARY_CATEGORY = "SUELDOS Y BONIFICACIONES";

function revalidateAll() {
  revalidatePath("/operaciones/finanzas/cierre-mensual");
  revalidatePath("/operaciones/finanzas/accionistas");
  revalidatePath("/operaciones/finanzas/cuentas-pagar");
  revalidatePath("/operaciones/finanzas/bancos");
  revalidatePath("/operaciones/gastos");
  revalidatePath("/");
}

const fmt = (v: number) => Math.round(v).toLocaleString("es-PY");

/**
 * Cierra el período abierto. El cierre NO es por mes reloj: cubre desde el
 * inicio del período abierto hasta las 23:59:59.999 (hora Asunción) del día
 * en que se presiona CERRAR. El nuevo período comienza a las 00:00:00 del
 * día siguiente.
 *
 * Además distribuye la utilidad bruta del período:
 *  - Control estricto: la suma de capitales iniciales de los ACCIONISTAS debe coincidir
 *    con el capital del último cierre.
 *  - PARTICIPANTES (ej. YL): su salario se registra como gasto + cuenta por pagar con
 *    fecha del DÍA DE CIERRE (dentro del período). Si se indica `bankAccountId`, se paga
 *    en el mismo acto desde ese banco con la misma fecha. Su retención se suma a la deuda.
 *  - ACCIONISTAS: el resto de la utilidad se suma a su capital.
 *  - El capital del cierre queda neto de la participación, por lo que coincide exactamente
 *    con la suma de los nuevos capitales de los accionistas y el período siguiente arranca en 0.
 */
export async function closePeriod(options?: { bankAccountId?: string | null }) {
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

    // --- Control estricto de capital de accionistas ---
    const { shareholders, participants } = await loadDistributionInputs();
    const totalShareholderCapital = shareholders.reduce((a, s) => a + s.initialCapital, 0);
    const { difference, isBalanced } = capitalMismatch(totalShareholderCapital, previousCapital);
    if (!isBalanced) {
      return {
        success: false,
        error: `No se puede cerrar: la suma del capital inicial de los accionistas (Gs. ${fmt(totalShareholderCapital)}) ` +
          `no coincide con el capital del último cierre (Gs. ${fmt(previousCapital)}). ` +
          `Diferencia: Gs. ${fmt(difference)}. Corregilo en Accionistas.`,
      };
    }

    const live = await getLiveCapital();
    const dist = computeDistribution(shareholders, participants, live.totalCapital - previousCapital);
    if (dist.errors.length > 0) {
      return { success: false, error: `No se puede cerrar: ${dist.errors.join(" ")}` };
    }

    const bankAccountId = options?.bankAccountId || null;
    if (bankAccountId && dist.totalSalary > 0) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) return { success: false, error: "La cuenta bancaria seleccionada no existe." };
    }
    const paidNow = !!bankAccountId && dist.totalSalary > 0;

    // Fecha del gasto / pago: día de cierre (convención del sistema: 12:00 UTC = 09:00 Asunción)
    const closingDayDate = dateFromInputPY(today);
    const periodLabel = `${formatDatePY(start)} AL ${formatDatePY(startOfDayPY(today))}`;

    const closure = await prisma.$transaction(async (tx) => {
      const created = await tx.monthlyClosure.create({
        data: {
          closingDate: today,
          periodStart: start,
          periodEnd: endOfDayPY(today),
          status: "CLOSED",
          closedAt: new Date(),
          closedById: session.user.id,
          previousCapital,
          // Fotografía ajustada por la liquidación de participantes
          bankBalance: live.bankBalance - (paidNow ? dist.totalSalary : 0),
          checksBalance: live.checksBalance,
          clientBalance: live.clientBalance,
          supplierBalance: live.supplierBalance + (paidNow ? 0 : dist.totalSalary),
          stockValue: live.stockValue,
          liveStockValue: live.liveStockValue,
          retentionBalance: live.retentionBalance + dist.totalRetained,
          totalCapital: live.totalCapital - dist.participantsTotal,
          netIncome: dist.grossIncome,
          participantShare: dist.participantsTotal,
          participantSalary: dist.totalSalary,
        },
      });

      let categoryId: string | null = null;

      // --- Participantes ---
      for (const row of dist.participants) {
        const p = participants.find(x => x.id === row.id)!.raw;
        let expenseId: string | null = null;
        let payableId: string | null = null;
        let transactionId: string | null = null;

        if (row.salary > 0) {
          if (!categoryId) {
            const cat = await tx.expenseCategory.upsert({
              where: { name: SALARY_CATEGORY },
              update: {},
              create: { name: SALARY_CATEGORY },
            });
            categoryId = cat.id;
          }

          let providerId = p.providerId;
          if (!providerId) {
            const existing = p.document ? await tx.provider.findUnique({ where: { ruc: p.document } }) : null;
            const provider = existing ?? await tx.provider.create({
              data: { legalName: p.name, ruc: p.document || null, notes: "PARTICIPANTE EN UTILIDADES" },
            });
            providerId = provider.id;
            await tx.shareholder.update({ where: { id: p.id }, data: { providerId } });
          }

          const pct = Math.round(100 - row.retentionRate);
          const expense = await tx.expense.create({
            data: {
              date: closingDayDate,
              categoryId,
              providerId,
              description: `PARTICIPACIÓN ${p.name} ${pct}% - PERÍODO ${periodLabel}`,
              amount: row.salary,
            },
          });
          const payable = await tx.accountPayable.create({
            data: {
              sourceId: expense.id,
              type: "EXPENSE",
              providerId,
              amount: row.salary,
              paidAmount: paidNow ? row.salary : 0,
              status: paidNow ? "PAID" : "PENDING",
              dueDate: closingDayDate,
            },
          });
          expenseId = expense.id;
          payableId = payable.id;

          if (paidNow) {
            const txRecord = await tx.transaction.create({
              data: {
                bankAccountId: bankAccountId!,
                date: closingDayDate,
                type: "EXPENSE",
                amount: row.salary,
                reference: "CIERRE",
                concept: `Pago participación ${p.name} - período ${periodLabel}`,
                userId: session.user.id,
              },
            });
            await tx.payablePayment.create({
              data: { accountPayableId: payable.id, date: closingDayDate, amount: row.salary, transactionId: txRecord.id },
            });
            transactionId = txRecord.id;
          }
        }

        if (row.retained !== 0) {
          await tx.retentionMovement.create({
            data: {
              shareholderId: p.id,
              date: closingDayDate,
              type: "CLOSURE",
              amount: row.retained,
              concept: `Retención ${Math.round(row.retentionRate)}% participación - período ${periodLabel}`,
              closureId: created.id,
            },
          });
        }

        await tx.shareholderCapitalHistory.create({
          data: {
            shareholderId: p.id,
            closureId: created.id,
            initialCapital: row.retentionBefore,
            participation: 0,
            profitShare: row.amount > 0 ? row.profitShare : 0,
            profitAmount: row.amount,
            capitalizedAmount: row.retained,
            withdrawalAmount: row.salary,
            finalCapital: row.retentionAfter,
            expenseId,
            payableId,
            transactionId,
          },
        });
      }

      // --- Accionistas ---
      for (const row of dist.shareholders) {
        await tx.shareholderCapitalHistory.create({
          data: {
            shareholderId: row.id,
            closureId: created.id,
            initialCapital: row.initialCapital,
            participation: row.participation,
            profitShare: row.profitShare,
            profitAmount: row.profitAmount,
            capitalizedAmount: row.profitAmount,
            withdrawalAmount: 0,
            finalCapital: row.finalCapital,
          },
        });
        await tx.shareholder.update({ where: { id: row.id }, data: { initialCapital: row.finalCapital } });
      }

      return created;
    }, { timeout: 60_000, maxWait: 20_000 });

    revalidateAll();
    return { success: true, data: closure };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Re-abre el ÚLTIMO cierre (solo ADMIN). No se pueden re-abrir cierres intermedios.
 * Revierte la distribución: restaura capitales de accionistas, elimina la retención del
 * período y el gasto / cuenta por pagar / pago bancario del salario generado en el cierre.
 * Se bloquea si el salario tiene pagos registrados DESPUÉS del cierre.
 */
export async function reopenLastClosure() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Solo el Administrador puede re-abrir un período" };
    }

    const last = await getLastClosure();
    if (!last) return { success: false, error: "No hay períodos cerrados" };

    const history = await prisma.shareholderCapitalHistory.findMany({ where: { closureId: last.id } });

    const payableIds = history.map(h => h.payableId).filter((id): id is string => !!id);
    const closingTxIds = history.map(h => h.transactionId).filter((id): id is string => !!id);

    if (payableIds.length > 0) {
      const laterPayments = await prisma.payablePayment.findMany({
        where: {
          accountPayableId: { in: payableIds },
          OR: [{ transactionId: null }, { transactionId: { notIn: closingTxIds } }],
        },
      });
      if (laterPayments.length > 0) {
        return {
          success: false,
          error: "No se puede re-abrir: el salario del participante generado en este cierre tiene pagos registrados después del cierre. Anulá esos pagos primero.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const h of history) {
        const sh = await tx.shareholder.findUnique({ where: { id: h.shareholderId } });
        if (sh && sh.type !== "PARTICIPANT") {
          await tx.shareholder.update({ where: { id: h.shareholderId }, data: { initialCapital: h.initialCapital } });
        }
      }
      if (payableIds.length > 0) {
        await tx.payablePayment.deleteMany({ where: { accountPayableId: { in: payableIds } } });
        await tx.accountPayable.deleteMany({ where: { id: { in: payableIds } } });
      }
      if (closingTxIds.length > 0) {
        await tx.transaction.deleteMany({ where: { id: { in: closingTxIds } } });
      }
      const expenseIds = history.map(h => h.expenseId).filter((id): id is string => !!id);
      if (expenseIds.length > 0) {
        await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
      }
      await tx.retentionMovement.deleteMany({ where: { closureId: last.id } });
      await tx.shareholderCapitalHistory.deleteMany({ where: { closureId: last.id } });
      await tx.monthlyClosure.update({ where: { id: last.id }, data: { status: "REOPENED" } });
    }, { timeout: 60_000, maxWait: 20_000 });

    revalidateAll();
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
        inventoryLots: { none: { unitCost: { gt: 0 } } }, // sin carne valorizada en cámara (las menudencias tienen costo 0)
        isLiveSale: false
      }
    }
  });
  const liveStockValue = liveStockClosures.reduce((acc, closure) => acc + closure.totalValue, 0);

  // Retención de participantes (ej. YL): deuda de la empresa, no es capital
  const retentionBalance = await getTotalRetentionBalance();

  const totalCapital = bankBalance + checksBalance + clientBalance + stockValue + liveStockValue - supplierBalance - retentionBalance;

  return {
    bankBalance,
    checksBalance,
    clientBalance,
    supplierBalance,
    stockValue,
    liveStockValue,
    retentionBalance,
    totalCapital
  };
}
