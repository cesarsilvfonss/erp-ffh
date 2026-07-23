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
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
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
