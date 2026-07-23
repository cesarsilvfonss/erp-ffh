"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createUser(data: { name: string; email: string; role: any }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "No autorizado" };
    }

    const hashedPassword = await bcrypt.hash("123456", 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        password: hashedPassword,
        status: true,
      }
    });

    revalidatePath("/configuracion/usuarios");
    return { success: true, user };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "El email ya está registrado." };
    }
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatus(id: string, currentStatus: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "No autorizado" };
    }
    
    // Evitar que el admin se desactive a sí mismo
    if (session?.user?.id === id) {
      return { success: false, error: "No puedes desactivar tu propio usuario." };
    }

    await prisma.user.update({
      where: { id },
      data: { status: !currentStatus }
    });

    revalidatePath("/configuracion/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changePassword(currentPass: string, newPass: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) return { success: false, error: "Usuario no encontrado" };

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      return { success: false, error: "La contraseña actual es incorrecta" };
    }

    const hashedNew = await bcrypt.hash(newPass, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNew }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
