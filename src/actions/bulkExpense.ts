"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBulkExpenses(data: {
  batchId?: string;
  date: Date;
  expenses: {
    categoryId: string;
    providerId: string;
    description: string;
    amount: number;
  }[]
}) {
  try {
    // Usamos transacción para asegurar que todos los gastos se guarden correctamente
    const result = await prisma.$transaction(async (tx) => {
      const createdExpenses = [];

      for (const exp of data.expenses) {
        // 1. Crear el gasto
        const expense = await tx.expense.create({
          data: {
            date: data.date,
            batchId: data.batchId || null,
            categoryId: exp.categoryId,
            providerId: exp.providerId,
            description: exp.description.toUpperCase(),
            amount: exp.amount
          }
        });

        // 2. Crear la cuenta por pagar (AccountPayable)
        await tx.accountPayable.create({
          data: {
            sourceId: expense.id,
            type: "EXPENSE",
            providerId: exp.providerId,
            amount: exp.amount,
            status: "PENDING",
            dueDate: data.date,
          }
        });

        createdExpenses.push(expense);
      }

      return createdExpenses;
    });
    
    revalidatePath("/operaciones/gastos");
    if (data.batchId) {
      revalidatePath(`/operaciones/lotes/${data.batchId}`);
    }
    
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Error creating bulk expenses:", error);
    return { success: false, error: error.message };
  }
}
