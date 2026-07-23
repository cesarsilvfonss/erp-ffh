"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProvider(data: {
  ruc?: string;
  legalName: string;
  tradeName?: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  isSlaughterhouse?: boolean;
}) {
  try {
    // Generar RUC interno si no se provee
    const finalRuc = data.ruc && data.ruc.trim() !== "" 
      ? data.ruc 
      : `INT-${Math.floor(Math.random() * 900000) + 100000}`;

    const provider = await prisma.provider.create({
      data: {
        ruc: finalRuc,
        legalName: data.legalName,
        tradeName: data.tradeName,
        address: data.address,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        isSlaughterhouse: data.isSlaughterhouse ?? false,
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
