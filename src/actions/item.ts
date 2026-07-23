"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createItem(data: {
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}) {
  try {
    const item = await prisma.item.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        description: data.description,
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
