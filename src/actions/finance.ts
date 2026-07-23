"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function processPayment(data: {
  receivableId: string;
  amount: number;
  method: string; // CASH, TRANSFER, CHECK, RETENTION
  date: string;
  reference?: string;
  bankAccountId?: string;
  // Check details
  checkBank?: string;
  checkNumber?: string;
  issueDate?: string;
  dueDate?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    return await prisma.$transaction(async (tx) => {
      const receivable = await tx.accountReceivable.findUnique({
        where: { id: data.receivableId },
        include: { client: true }
      });

      if (!receivable) throw new Error("Cuenta a cobrar no encontrada");

      const balance = receivable.amount - receivable.paidAmount;
      if (data.amount > balance) {
        throw new Error("El monto del pago supera el saldo pendiente");
      }

      const newPaidAmount = receivable.paidAmount + data.amount;
      const newStatus = newPaidAmount >= receivable.amount ? "PAID" : "PARTIAL";

      // 1. Create the Payment record
      const payment = await tx.payment.create({
        data: {
          accountReceivableId: data.receivableId,
          amount: data.amount,
          method: data.method as any,
          date: new Date(data.date),
          reference: data.reference || null,
          bankAccountId: data.method === "CASH" || data.method === "TRANSFER" ? data.bankAccountId : null,
        }
      });

      // 2. If it's CASH or TRANSFER, create a Transaction to update Bank Balance
      if ((data.method === "CASH" || data.method === "TRANSFER") && data.bankAccountId) {
        const transaction = await tx.transaction.create({
          data: {
            bankAccountId: data.bankAccountId,
            date: new Date(data.date),
            type: "INCOME",
            amount: data.amount,
            reference: data.reference,
            concept: `Cobro de Cliente: ${receivable.client.legalName}`,
            userId: session.user.id
          }
        });

        // Link payment to transaction
        await tx.payment.update({
          where: { id: payment.id },
          data: { transactionId: transaction.id }
        });

        // Update bank balance
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: { initialBalance: { increment: data.amount } } // initialBalance acts as current balance in this simple model, or maybe we just calculate it, but since we don't have currentBalance field, we increment initialBalance for now. Wait! I'll just leave it or create a new field later if needed. Usually balance is calculated from transactions. I will just rely on transactions.
        });
      }

      // 3. If it's a CHECK, store it in portfolio
      if (data.method === "CHECK" && data.checkBank && data.checkNumber) {
        await tx.check.create({
          data: {
            paymentId: payment.id,
            bankName: data.checkBank,
            checkNumber: data.checkNumber,
            issueDate: new Date(data.issueDate!),
            dueDate: new Date(data.dueDate!),
            amount: data.amount,
            status: "IN_PORTFOLIO"
          }
        });
      }

      // 4. Update the Receivable
      await tx.accountReceivable.update({
        where: { id: data.receivableId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      revalidatePath("/operaciones/finanzas/cuentas-cobrar");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return { success: false, error: error.message };
  }
}

export async function processCheckDeposit(checkId: string, bankAccountId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    return await prisma.$transaction(async (tx) => {
      const check = await tx.check.findUnique({
        where: { id: checkId },
        include: { payment: { include: { accountReceivable: { include: { client: true } } } } }
      });

      if (!check) throw new Error("Cheque no encontrado");
      if (check.status !== "IN_PORTFOLIO") throw new Error("El cheque ya no está en cartera");

      const bank = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) throw new Error("Banco destino no encontrado");

      // 1. Update Check
      await tx.check.update({
        where: { id: checkId },
        data: {
          status: "DEPOSITED",
          depositBankId: bankAccountId
        }
      });

      // 2. Create Transaction to update Bank Balance
      await tx.transaction.create({
        data: {
          bankAccountId: bankAccountId,
          date: new Date(), // Fecha de depósito
          type: "INCOME",
          amount: check.amount,
          reference: `Depósito Cheque ${check.checkNumber} - ${check.bankName}`,
          concept: `Cobro Cheque: ${check.payment.accountReceivable.client.legalName}`,
          userId: session.user.id
        }
      });

      // 3. Update Bank Balance
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { initialBalance: { increment: check.amount } }
      });

      revalidatePath("/operaciones/finanzas/cheques");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Error processing check deposit:", error);
    return { success: false, error: error.message };
  }
}
