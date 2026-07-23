"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { AnimalCategory, SlaughterCondition } from "@prisma/client";

export async function initiateFaena(batchId: string) {
  try {
    const slaughter = await prisma.slaughter.create({
      data: {
        batchId,
        date: new Date(),
        status: "OPEN"
      }
    });
    
    // Update batch status to IN_SLAUGHTER
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "IN_SLAUGHTER" }
    });
    
    revalidatePath("/operaciones/faena");
    revalidatePath("/operaciones/lotes");
    
    return { success: true, data: slaughter };
  } catch (error: any) {
    console.error("Error initiating faena:", error);
    return { success: false, error: error.message };
  }
}

export async function addFaenaDetail(data: {
  slaughterId: string;
  category: AnimalCategory;
  condition: SlaughterCondition;
  weight: number;
}) {
  try {
    // Get the current max sequence number for this slaughter
    const lastDetail = await prisma.slaughterDetail.findFirst({
      where: { slaughterId: data.slaughterId },
      orderBy: { sequenceNumber: 'desc' }
    });
    const nextSequenceNumber = (lastDetail?.sequenceNumber || 0) + 1;

    const detail = await prisma.slaughterDetail.create({
      data: {
        slaughterId: data.slaughterId,
        category: data.category,
        condition: data.condition,
        weight: data.weight,
        sequenceNumber: nextSequenceNumber
      }
    });
    
    revalidatePath(`/operaciones/faena/${data.slaughterId}`);
    return { success: true, data: detail };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFaenaDetail(id: string, slaughterId: string) {
  try {
    await prisma.slaughterDetail.delete({ where: { id } });
    revalidatePath(`/operaciones/faena/${slaughterId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeFaena(slaughterId: string, payload: { totalWeight: number, yieldPercent: number }) {
  try {
    const slaughter = await prisma.slaughter.update({
      where: { id: slaughterId },
      data: { 
        status: "CLOSED",
        totalWeight: payload.totalWeight,
        yield: payload.yieldPercent
      }
    });

    // Cambiar estado del lote a CLOSED o IN_SALE
    await prisma.batch.update({
      where: { id: slaughter.batchId },
      data: { status: "CLOSED" } // Podría ser IN_INVENTORY, lo dejaremos CLOSED para indicar fin del ciclo de compras.
    });

    revalidatePath("/operaciones/faena");
    revalidatePath(`/operaciones/faena/${slaughterId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
