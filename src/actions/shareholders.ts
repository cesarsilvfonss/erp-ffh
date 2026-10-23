"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const PATH = "/operaciones/finanzas/accionistas";

type ShareholderInput = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  notes?: string;
  initialCapital?: number;
};

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Solo el Administrador puede gestionar accionistas");
  }
}

function clean(data: ShareholderInput) {
  const name = data.name?.trim().toUpperCase();
  if (!name) throw new Error("El nombre es obligatorio");
  const initialCapital = Number(data.initialCapital) || 0;
  if (initialCapital < 0) throw new Error("El capital inicial no puede ser negativo");
  return {
    name,
    document: data.document?.trim().toUpperCase() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim().toLowerCase() || null,
    notes: data.notes?.trim() || null,
    initialCapital,
  };
}

export async function createShareholder(data: ShareholderInput) {
  try {
    await assertAdmin();
    const shareholder = await prisma.shareholder.create({ data: clean(data) });
    revalidatePath(PATH);
    return { success: true, shareholder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShareholder(id: string, data: ShareholderInput) {
  try {
    await assertAdmin();
    const shareholder = await prisma.shareholder.update({ where: { id }, data: clean(data) });
    revalidatePath(PATH);
    return { success: true, shareholder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Activa / desactiva un accionista. Los inactivos no participan del % ni de la capitalización. */
export async function toggleShareholderStatus(id: string) {
  try {
    await assertAdmin();
    const current = await prisma.shareholder.findUnique({ where: { id } });
    if (!current) throw new Error("Accionista no encontrado");
    await prisma.shareholder.update({ where: { id }, data: { isActive: !current.isActive } });
    revalidatePath(PATH);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
