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

export async function updateProvider(id: string, data: {
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
    const finalRuc = data.ruc && data.ruc.trim() !== "" 
      ? data.ruc 
      : `INT-${Math.floor(Math.random() * 900000) + 100000}`;

    const provider = await prisma.provider.update({
      where: { id },
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
    revalidatePath("/operaciones/lotes/nuevo");
    
    return { success: true, data: provider };
  } catch (error: any) {
    console.error("Error updating provider:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProvider(id: string) {
  try {
    // Check if provider has related records
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        batches: true,
        batchesAsSlaughterhouse: true,
        expenses: true,
        accountsPayable: true,
        loans: true
      }
    });

    if (!provider) {
      throw new Error("Proveedor no encontrado");
    }

    if (
      provider.batches.length > 0 || 
      provider.batchesAsSlaughterhouse.length > 0 || 
      provider.expenses.length > 0 || 
      provider.accountsPayable.length > 0 || 
      provider.loans.length > 0
    ) {
      throw new Error("No se puede eliminar el proveedor porque tiene operaciones, gastos o cuentas asociadas.");
    }

    await prisma.provider.delete({
      where: { id }
    });
    
    revalidatePath("/terceros/proveedores");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting provider:", error);
    return { success: false, error: error.message };
  }
}
