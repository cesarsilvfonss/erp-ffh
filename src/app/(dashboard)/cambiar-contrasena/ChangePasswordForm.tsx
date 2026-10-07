"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { changePassword } from "@/actions/users";
import { signOut } from "next-auth/react";

export function ChangePasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const currentPass = formData.get("currentPass") as string;
    const newPass = formData.get("newPass") as string;
    const confirmPass = formData.get("confirmPass") as string;

    if (newPass !== confirmPass) {
      setError("Las contraseñas nuevas no coinciden");
      setIsSubmitting(false);
      return;
    }

    if (newPass.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsSubmitting(false);
      return;
    }

    const res = await changePassword(currentPass, newPass);
    
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        signOut(); // Force re-login after password change
      }, 2000);
    } else {
      setError(res.error || "Error al cambiar contraseña");
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-2 py-4">
        <h3 className="text-lg font-medium text-emerald-400">Contraseña Actualizada</h3>
        <p className="text-zinc-400 text-sm">Serás redirigido al login en unos segundos...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Contraseña Actual (123456)</label>
        <input 
          name="currentPass"
          type="password"
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nueva Contraseña</label>
        <input 
          name="newPass"
          type="password"
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirmar Nueva Contraseña</label>
        <input 
          name="confirmPass"
          type="password"
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      <div className="pt-2">
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar y Continuar
        </button>
      </div>
    </form>
  );
}
