"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: {
  legalName: string;
  tradeName?: string;
  contact?: string;
  phone?: string;
  email?: string;
  paymentTermDays?: number;
}) {
  try {
    const client = await prisma.client.create({
      data: {
        legalName: data.legalName,
        tradeName: data.tradeName,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        paymentTermDays: data.paymentTermDays || 0,
      },
    });
    
    revalidatePath("/terceros/clientes");
    
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { success: false, error: error.message };
  }
}
