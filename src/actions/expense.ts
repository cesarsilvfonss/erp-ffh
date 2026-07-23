"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createExpenseCategory(data: {
  name: string;
  description?: string;
}) {
  try {
    const category = await prisma.expenseCategory.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
    
    revalidatePath("/configuracion/gastos");
    
    return { success: true, data: category };
  } catch (error: any) {
    console.error("Error creating expense category:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Ya existe una categoría con este nombre." };
    }
    return { success: false, error: error.message };
  }
}
