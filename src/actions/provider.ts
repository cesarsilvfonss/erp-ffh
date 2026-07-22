"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProvider(data: {
  legalName: string;
  contact?: string;
  phone?: string;
  email?: string;
}) {
  try {
    const provider = await prisma.provider.create({
      data: {
        legalName: data.legalName,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
      },
    });
    
    revalidatePath("/terceros/proveedores");
    // Also revalidate new batch page so the provider shows up in the dropdown
    revalidatePath("/operaciones/lotes/nuevo");
    
    return { success: true, data: provider };
  } catch (error: any) {
    console.error("Error creating provider:", error);
    return { success: false, error: error.message };
  }
}
