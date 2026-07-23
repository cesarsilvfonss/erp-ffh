"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createItem(data: {
  name: string;
  category: string;
  unit: string;
  description?: string;
  isSlaughterable?: boolean;
}) {
  try {
    // Generate sequential code: ART-0001
    const lastItem = await prisma.item.findFirst({
      orderBy: { code: 'desc' },
      where: { code: { startsWith: 'ART-' } }
    });

    let nextNumber = 1;
    if (lastItem && lastItem.code) {
      const parts = lastItem.code.split('-');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        nextNumber = parseInt(parts[1], 10) + 1;
      }
    }
    
    const newCode = `ART-${nextNumber.toString().padStart(4, '0')}`;

    const item = await prisma.item.create({
      data: {
        code: newCode,
        name: data.name,
        category: data.category,
        unit: data.unit,
        description: data.description,
        isSlaughterable: data.isSlaughterable || false,
      },
    });
    
    revalidatePath("/configuracion/articulos");
    
    return { success: true, data: item };
  } catch (error: any) {
    console.error("Error creating item:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Ya existe un artículo con este código." };
    }
    return { success: false, error: error.message };
  }
}
