"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: {
  legalName: string;
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
