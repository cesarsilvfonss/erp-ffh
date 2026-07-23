"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBulkExpenses(data: {
  batchId: string;
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
    const result = await prisma.$transaction(
      data.expenses.map(exp => 
        prisma.expense.create({
          data: {
            date: data.date,
            batchId: data.batchId,
            categoryId: exp.categoryId,
            providerId: exp.providerId,
            description: exp.description,
            amount: exp.amount
          }
        })
      )
    );
    
    revalidatePath("/operaciones/gastos");
    revalidatePath(`/operaciones/lotes/${data.batchId}`);
    
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Error creating bulk expenses:", error);
    return { success: false, error: error.message };
  }
}
