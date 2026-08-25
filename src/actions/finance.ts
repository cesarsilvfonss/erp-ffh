"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

import { checkPeriodClosure } from "@/lib/closure";

export async function processPayment(data: {
  receivableId: string;
  date: string;
  payments: Array<{
    amount: number;
    method: string;
    reference?: string;
    bankAccountId?: string;
    checkBank?: string;
    checkNumber?: string;
    issueDate?: string;
    dueDate?: string;
  }>;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    await checkPeriodClosure(new Date(data.date));

    return await prisma.$transaction(async (tx) => {
      const receivable = await tx.accountReceivable.findUnique({
        where: { id: data.receivableId },
        include: { client: true }
      });

      if (!receivable) throw new Error("Cuenta a cobrar no encontrada");

      const balance = receivable.amount - receivable.paidAmount;
      
      const totalToPay = data.payments.reduce((acc, p) => acc + p.amount, 0);

      if (totalToPay <= 0) throw new Error("El monto total a pagar debe ser mayor a 0");
      // Permitimos un pequeño margen por problemas de redondeo en retenciones
      if (totalToPay > balance + 1) throw new Error("El monto de los pagos supera el saldo pendiente");

      let newPaidAmount = receivable.paidAmount;

      for (const p of data.payments) {
        newPaidAmount += p.amount;

        // 1. Create the Payment record
        const payment = await tx.payment.create({
          data: {
            accountReceivableId: data.receivableId,
            amount: p.amount,
            method: p.method === "RETENTION_IVA" || p.method === "RETENTION_RENTA" ? "RETENTION" : (p.method as any),
            date: new Date(data.date + "T12:00:00Z"),
            reference: p.method === "RETENTION_IVA" ? "RETENCION_IVA" : p.method === "RETENTION_RENTA" ? "RETENCION_RENTA" : (p.reference || null),
            bankAccountId: p.method === "CASH" || p.method === "TRANSFER" ? p.bankAccountId : null,
          }
        });

        // 2. If it's CASH or TRANSFER, create a Transaction to update Bank Balance
        if ((p.method === "CASH" || p.method === "TRANSFER") && p.bankAccountId) {
          const transaction = await tx.transaction.create({
            data: {
              bankAccountId: p.bankAccountId,
              date: new Date(data.date + "T12:00:00Z"),
              type: "INCOME",
              amount: p.amount,
              reference: p.reference,
              concept: `Cobro de Cliente: ${receivable.client.legalName}`,
              userId: session.user.id
            }
          });

          // Link payment to transaction
          await tx.payment.update({
            where: { id: payment.id },
            data: { transactionId: transaction.id }
          });
        }

        // 3. If it's CHECK, create Check record
        if (p.method === "CHECK" && p.checkBank && p.checkNumber && p.issueDate && p.dueDate) {
          await tx.check.create({
            data: {
              paymentId: payment.id,
              bankName: p.checkBank,
              checkNumber: p.checkNumber,
              issueDate: new Date(p.issueDate + "T12:00:00Z"),
              dueDate: new Date(p.dueDate + "T12:00:00Z"),
              amount: p.amount,
              status: "IN_PORTFOLIO"
            }
          });
        }
      }

      // 4. Update the Receivable
      const newStatus = newPaidAmount >= receivable.amount - 1 ? "PAID" : "PARTIAL";
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

export async function createLoan(data: {
  providerId: string;
  bankAccountId: string;
  date: string;
  principalAmount: number;
  concept: string;
  quotas: { date: string; amount: number }[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    await checkPeriodClosure(new Date(data.date));

    if (!data.providerId || !data.bankAccountId || data.quotas.length === 0) {
      throw new Error("Faltan datos requeridos para el préstamo");
    }

    const totalQuotas = data.quotas.reduce((acc, q) => acc + q.amount, 0);
    const interestRate = ((totalQuotas - data.principalAmount) / data.principalAmount) * 100;

    return await prisma.$transaction(async (tx) => {
      // 1. Create the Loan record
      const loan = await tx.loan.create({
        data: {
          providerId: data.providerId,
          bankAccountId: data.bankAccountId,
          date: new Date(data.date + "T12:00:00Z"),
          principalAmount: data.principalAmount,
          totalAmount: totalQuotas,
          interestRate,
          concept: data.concept.toUpperCase()
        }
      });

      // 2. Create the Bank Transaction (INCOME)
      await tx.transaction.create({
        data: {
          bankAccountId: data.bankAccountId,
          date: new Date(data.date + "T12:00:00Z"),
          type: "INCOME",
          amount: data.principalAmount,
          concept: `Préstamo Adquirido: ${data.concept}`,
          userId: session.user.id
        }
      });

      // 3. Create the Accounts Payable (Installments)
      for (let i = 0; i < data.quotas.length; i++) {
        const quota = data.quotas[i];
        await tx.accountPayable.create({
          data: {
            sourceId: loan.id,
            type: "LOAN",
            providerId: data.providerId,
            amount: quota.amount,
            dueDate: new Date(quota.date + "T12:00:00Z"),
            status: "PENDING"
          }
        });
      }

      revalidatePath("/operaciones/finanzas");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Error creating loan:", error);
    return { success: false, error: error.message };
  }
}

export async function processCheckDeposit(checkId: string, bankAccountId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    await checkPeriodClosure(new Date());

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

      revalidatePath("/operaciones/finanzas/cheques");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Error processing check deposit:", error);
    return { success: false, error: error.message };
  }
}

export async function processPayablePayment(data: {
  payableId: string;
  amount: number;
  method: string;
  date: string;
  reference?: string;
  bankAccountId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    await checkPeriodClosure(new Date(data.date));

    return await prisma.$transaction(async (tx) => {
      const payable = await tx.accountPayable.findUnique({
        where: { id: data.payableId },
        include: { provider: true }
      });

      if (!payable) throw new Error("Cuenta por pagar no encontrada");

      const balance = payable.amount - payable.paidAmount;
      if (data.amount > balance) {
        throw new Error("El monto del pago supera el saldo pendiente");
      }

      const newPaidAmount = payable.paidAmount + data.amount;
      const newStatus = newPaidAmount >= payable.amount ? "PAID" : "PARTIAL";

      // 1. Create the Bank Transaction (OUTCOME) if CASH or TRANSFER
      let transactionId = null;
      if ((data.method === "CASH" || data.method === "TRANSFER") && data.bankAccountId) {
        const txRecord = await tx.transaction.create({
          data: {
            bankAccountId: data.bankAccountId,
            date: new Date(data.date + "T12:00:00Z"),
            type: "EXPENSE",
            amount: data.amount,
            reference: data.reference,
            concept: `Pago a Proveedor/Acreedor: ${payable.provider.legalName}`,
            userId: session.user.id
          }
        });
        transactionId = txRecord.id;
      }

      // 1.5 Create the PayablePayment
      await tx.payablePayment.create({
        data: {
          accountPayableId: data.payableId,
          date: new Date(data.date + "T12:00:00Z"),
          amount: data.amount,
          transactionId: transactionId
        }
      });

      // 2. Update the Payable record
      await tx.accountPayable.update({
        where: { id: data.payableId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      revalidatePath("/operaciones/finanzas/cuentas-pagar");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Error processing payable payment:", error);
    return { success: false, error: error.message };
  }
}

export async function processBulkPayablePayment(data: {
  payableIds: string[];
  method: string;
  date: string;
  reference?: string;
  bankAccountId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    await checkPeriodClosure(new Date(data.date));

    if (data.payableIds.length === 0) {
      throw new Error("No se han seleccionado cuentas para pagar");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch all selected payables
      const payables = await tx.accountPayable.findMany({
        where: { id: { in: data.payableIds } },
        include: { provider: true }
      });

      if (payables.length === 0) throw new Error("Cuentas por pagar no encontradas");

      let totalToPay = 0;
      const payableUpdates = [];

      for (const payable of payables) {
        const balance = payable.amount - payable.paidAmount;
        if (balance > 0) {
          totalToPay += balance;
          payableUpdates.push({
            payableId: payable.id,
            amountToPay: balance
          });
        }
      }

      if (totalToPay <= 0) {
        throw new Error("Las cuentas seleccionadas no tienen saldo pendiente");
      }

      // 2. Create ONE Bank Transaction (OUTCOME) if CASH or TRANSFER
      let transactionId = null;
      if ((data.method === "CASH" || data.method === "TRANSFER") && data.bankAccountId) {
        // Use generic concept if multiple providers, or specific if 1
        const uniqueProviders = new Set(payables.map(p => p.providerId));
        const providerName = uniqueProviders.size === 1 ? payables[0].provider.legalName : "Varios Proveedores";
        
        const txRecord = await tx.transaction.create({
          data: {
            bankAccountId: data.bankAccountId,
            date: new Date(data.date + "T12:00:00Z"),
            type: "EXPENSE",
            amount: totalToPay,
            reference: data.reference,
            concept: `Pago Múltiple a ${providerName}`,
            userId: session.user.id
          }
        });
        transactionId = txRecord.id;
      }

      // 3. Process each payable
      for (const update of payableUpdates) {
        // Create PayablePayment for traceability
        await tx.payablePayment.create({
          data: {
            accountPayableId: update.payableId,
            date: new Date(data.date + "T12:00:00Z"),
            amount: update.amountToPay,
            transactionId: transactionId
          }
        });

        // Update the Payable record (paid fully)
        await tx.accountPayable.update({
          where: { id: update.payableId },
          data: {
            paidAmount: { increment: update.amountToPay },
            status: "PAID"
          }
        });
      }

      revalidatePath("/operaciones/finanzas");
      revalidatePath("/operaciones/finanzas/cuentas-pagar");
      return { success: true, count: payableUpdates.length, total: totalToPay };
    });
  } catch (error: any) {
    console.error("Error processing bulk payable payment:", error);
    return { success: false, error: error.message };
  }
}
