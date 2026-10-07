import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function CambiarContrasenaPage() {
  const session = await getServerSession(authOptions);
  
  // Si no está forzado a cambiar, lo mandamos al home
  if (!session?.user || !(session.user as any).mustChangePassword) {
    redirect("/");
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Actualizar Contraseña</h1>
            <p className="text-zinc-400 text-sm mt-1">Por motivos de seguridad, es necesario que establezcas una nueva contraseña antes de continuar.</p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
