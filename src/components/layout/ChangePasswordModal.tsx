"use client";

import { useState } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { changePassword } from "@/actions/users";
import { signOut } from "next-auth/react";

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

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
    }
    
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-zinc-100">Cambiar Contraseña</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-100">Contraseña Actualizada</h3>
            <p className="text-zinc-400 text-sm">Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Contraseña Actual</label>
              <input 
                name="currentPass"
                type="password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nueva Contraseña</label>
              <input 
                name="newPass"
                type="password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirmar Nueva Contraseña</label>
              <input 
                name="confirmPass"
                type="password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Actualizar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
