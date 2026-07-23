import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { UserForm } from "./UserForm";
import { UserList } from "./UserList";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Gestión de Usuarios
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Administrar accesos y roles del sistema.</p>
        </div>
        
        <UserForm />
      </div>

      <UserList initialUsers={users} currentUserId={session.user.id} />
    </div>
  );
}
