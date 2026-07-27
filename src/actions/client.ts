"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: {
  legalName: string;
  ruc?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  contact?: string;
  paymentTermDays?: number;
  isIvaRetainer?: boolean;
  isRentRetainer?: boolean;
  notes?: string;
}) {
  try {
    const client = await prisma.client.create({
      data: {
        legalName: data.legalName,
        ruc: data.ruc || null,
        tradeName: data.tradeName,
        phone: data.phone,
        email: data.email,
        contact: data.contact,
        paymentTermDays: data.paymentTermDays,
        isIvaRetainer: data.isIvaRetainer || false,
        isRentRetainer: data.isRentRetainer || false,
        notes: data.notes,
      },
    });
    
    revalidatePath("/terceros/clientes");
    
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClient(id: string, data: {
  legalName: string;
  ruc?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  contact?: string;
  paymentTermDays?: number;
  isIvaRetainer?: boolean;
  isRentRetainer?: boolean;
  notes?: string;
}) {
  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        legalName: data.legalName,
        ruc: data.ruc || null,
        tradeName: data.tradeName,
        phone: data.phone,
        email: data.email,
        contact: data.contact,
        paymentTermDays: data.paymentTermDays,
        isIvaRetainer: data.isIvaRetainer || false,
        isRentRetainer: data.isRentRetainer || false,
        notes: data.notes,
      },
    });
    
    revalidatePath("/terceros/clientes");
    
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Error updating client:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteClient(id: string) {
  try {
    // Check if client has related records
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        sales: true,
        accountsReceivable: true
      }
    });

    if (!client) {
      throw new Error("Cliente no encontrado");
    }

    if (client.sales.length > 0 || client.accountsReceivable.length > 0) {
      throw new Error("No se puede eliminar el cliente porque tiene ventas o cuentas por cobrar asociadas.");
    }

    await prisma.client.delete({
      where: { id }
    });
    
    revalidatePath("/terceros/clientes");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return { success: false, error: error.message };
  }
}
