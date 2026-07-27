"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBankAccount(data: {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currencyId: string;
  initialBalance: number;
}) {
  try {
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: data.bankName.toUpperCase(),
        accountName: data.accountName.toUpperCase(),
        accountNumber: data.accountNumber.toUpperCase(),
        currencyId: data.currencyId,
        initialBalance: data.initialBalance,
        status: true
      }
    });

    revalidatePath("/operaciones/finanzas/bancos");
    return { success: true, bank };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adjustBankBalance(data: {
  bankAccountId: string;
  newBalance: number;
  reason: string;
}) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("@/lib/auth");
    
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      throw new Error("Solo el administrador puede ajustar saldos bancarios.");
    }

    const bank = await prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
      include: { transactions: true }
    });

    if (!bank) throw new Error("Cuenta bancaria no encontrada.");

    // Calcular el saldo actual real
    const currentBalance = bank.transactions.reduce((acc, tx) => {
      return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
    }, bank.initialBalance);

    const difference = data.newBalance - currentBalance;

    if (difference === 0) {
      throw new Error("El nuevo saldo es idéntico al actual, no hay ajuste que hacer.");
    }

    const type = difference > 0 ? "INCOME" : "EXPENSE";

    await prisma.$transaction(async (tx) => {
      // 1. Crear la transacción de ajuste
      await tx.transaction.create({
        data: {
          bankAccountId: data.bankAccountId,
          date: new Date(),
          type,
          amount: Math.abs(difference),
          concept: `AJUSTE DE SALDO: ${data.reason}`,
          reference: "AJUSTE-SISTEMA",
          userId: session.user.id
        }
      });
      // 2. Modificar el initialBalance no es estrictamente necesario si el saldo se calcula al vuelo,
      // pero en este sistema algunas consultas podrían basarse en transactions + initialBalance.
      // Al agregar la transacción, la suma (initialBalance + transactions) ya dará el saldo correcto.
    });

    revalidatePath("/operaciones/finanzas/bancos");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adjusting bank balance:", error);
    return { success: false, error: error.message };
  }
}
