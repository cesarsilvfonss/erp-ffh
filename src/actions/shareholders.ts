"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkPeriodClosure, assertNotFutureDate } from "@/lib/closure";
import { dateFromInputPY, INITIAL_PERIOD_START_YMD } from "@/lib/dates";
import { getRetentionBalances } from "@/lib/distribution";

const PATH = "/operaciones/finanzas/accionistas";

type ShareholderInput = {
  type: "SHAREHOLDER" | "PARTICIPANT";
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  notes?: string;
  initialCapital?: number; // solo accionistas
  fixedProfitShare?: number | null; // solo participantes: % sobre la utilidad bruta
  capitalizationRate?: number; // solo participantes: % retenido
  initialRetention?: number; // solo participantes, al crear: saldo inicial de retención
};

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Solo el Administrador puede gestionar accionistas");
  }
  return session;
}

function num(v: unknown, fallback: number) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return isNaN(n) ? NaN : n;
}

function clean(data: ShareholderInput) {
  const name = data.name?.trim().toUpperCase();
  if (!name) throw new Error("El nombre es obligatorio");
  const type = data.type === "PARTICIPANT" ? "PARTICIPANT" : "SHAREHOLDER";

  const base = {
    type,
    name,
    document: data.document?.trim().toUpperCase() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim().toLowerCase() || null,
    notes: data.notes?.trim() || null,
  };

  if (type === "SHAREHOLDER") {
    const initialCapital = num(data.initialCapital, 0);
    if (isNaN(initialCapital) || initialCapital < 0) throw new Error("El capital inicial no puede ser negativo");
    return { ...base, initialCapital, fixedProfitShare: null, capitalizationRate: 100 };
  }

  const fixedProfitShare = num(data.fixedProfitShare, NaN);
  if (isNaN(fixedProfitShare) || fixedProfitShare <= 0 || fixedProfitShare > 100) {
    throw new Error("El % sobre la utilidad del participante debe estar entre 0 y 100");
  }
  const capitalizationRate = num(data.capitalizationRate, 0);
  if (isNaN(capitalizationRate) || capitalizationRate < 0 || capitalizationRate > 100) {
    throw new Error("El % retenido debe estar entre 0 y 100");
  }
  return { ...base, initialCapital: 0, fixedProfitShare, capitalizationRate };
}

/** Valida que la suma de % de participantes activos no supere el 100%. */
async function assertParticipantsUnder100(fixedProfitShare: number | null, excludeId?: string) {
  if (fixedProfitShare == null) return;
  const others = await prisma.shareholder.findMany({
    where: { isActive: true, type: "PARTICIPANT", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  const total = others.reduce((a, s) => a + (s.fixedProfitShare || 0), 0) + fixedProfitShare;
  if (total > 100 + 1e-9) throw new Error(`La suma de % de participantes quedaría en ${total.toFixed(4)}% (máximo 100%).`);
}

export async function createShareholder(data: ShareholderInput) {
  try {
    await assertAdmin();
    const c = clean(data);
    await assertParticipantsUnder100(c.fixedProfitShare);
    const initialRetention = c.type === "PARTICIPANT" ? num(data.initialRetention, 0) : 0;
    if (isNaN(initialRetention) || initialRetention < 0) throw new Error("La retención inicial no puede ser negativa");

    const shareholder = await prisma.$transaction(async (tx) => {
      const sh = await tx.shareholder.create({ data: c });
      if (initialRetention > 0) {
        await tx.retentionMovement.create({
          data: {
            shareholderId: sh.id,
            date: dateFromInputPY(INITIAL_PERIOD_START_YMD),
            type: "INITIAL",
            amount: initialRetention,
            concept: "Saldo inicial de retención",
          },
        });
      }
      return sh;
    });
    revalidatePath(PATH);
    revalidatePath("/operaciones/finanzas/cierre-mensual");
    revalidatePath("/");
    return { success: true, shareholder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShareholder(id: string, data: ShareholderInput) {
  try {
    await assertAdmin();
    const current = await prisma.shareholder.findUnique({ where: { id } });
    if (!current) throw new Error("Registro no encontrado");
    const c = clean(data);
    if (c.type !== current.type) {
      const hasHistory = await prisma.shareholderCapitalHistory.count({ where: { shareholderId: id } });
      const hasRetention = await prisma.retentionMovement.count({ where: { shareholderId: id } });
      if (hasHistory > 0 || hasRetention > 0) throw new Error("No se puede cambiar el tipo: ya tiene historial o retenciones registradas.");
    }
    await assertParticipantsUnder100(c.fixedProfitShare, id);
    const shareholder = await prisma.shareholder.update({ where: { id }, data: c });
    revalidatePath(PATH);
    return { success: true, shareholder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Activa / desactiva. Los inactivos no participan de la distribución ni del control de capital. */
export async function toggleShareholderStatus(id: string) {
  try {
    await assertAdmin();
    const current = await prisma.shareholder.findUnique({ where: { id } });
    if (!current) throw new Error("Registro no encontrado");
    await prisma.shareholder.update({ where: { id }, data: { isActive: !current.isActive } });
    revalidatePath(PATH);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Paga (total o parcialmente) la retención acumulada de un participante desde un banco.
 * Baja el banco y baja la deuda de retención: el capital no cambia.
 */
export async function payRetention(data: { shareholderId: string; bankAccountId: string; date: string; amount: number; reference?: string }) {
  try {
    const session = await assertAdmin();
    const amount = Math.round(Number(data.amount));
    if (!amount || amount <= 0) throw new Error("El monto debe ser mayor a 0");
    if (!data.bankAccountId) throw new Error("Seleccioná la cuenta bancaria");

    const date = dateFromInputPY(data.date);
    assertNotFutureDate(date);
    await checkPeriodClosure(date);

    const sh = await prisma.shareholder.findUnique({ where: { id: data.shareholderId } });
    if (!sh || sh.type !== "PARTICIPANT") throw new Error("Participante no encontrado");

    const balance = (await getRetentionBalances()).get(sh.id) || 0;
    if (amount > Math.round(balance)) {
      throw new Error(`El monto supera el saldo de retención (Gs. ${Math.round(balance).toLocaleString("es-PY")}).`);
    }

    await prisma.$transaction(async (tx) => {
      const txRecord = await tx.transaction.create({
        data: {
          bankAccountId: data.bankAccountId,
          date,
          type: "EXPENSE",
          amount,
          reference: data.reference?.trim() || "RETENCIÓN",
          concept: `Pago de retención: ${sh.name}`,
          userId: session.user.id,
        },
      });
      await tx.retentionMovement.create({
        data: {
          shareholderId: sh.id,
          date,
          type: "PAYMENT",
          amount: -amount,
          concept: `Pago de retención${data.reference ? ` (${data.reference.trim()})` : ""}`,
          transactionId: txRecord.id,
        },
      });
    });

    revalidatePath(PATH);
    revalidatePath("/operaciones/finanzas/bancos");
    revalidatePath("/operaciones/finanzas/cierre-mensual");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
