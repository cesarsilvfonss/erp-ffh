"use client";

import { toggleUserStatus, unlockUser, resetPassword } from "@/actions/users";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Shield, ShieldAlert, User as UserIcon, Lock, KeyRound } from "lucide-react";

export function UserList({ initialUsers, currentUserId, currentUserRole }: { initialUsers: any[], currentUserId: string, currentUserRole: string }) {
  async function handleToggleStatus(id: string, currentStatus: boolean) {
    if (confirm(`¿Estás seguro de que deseas ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) {
      await toggleUserStatus(id, currentStatus);
    }
  }

  async function handleUnlock(id: string) {
    if (confirm("¿Estás seguro de que deseas desbloquear este usuario?")) {
      await unlockUser(id);
    }
  }

  async function handleResetPassword(id: string) {
    if (confirm("¿Estás seguro de restablecer la contraseña de este usuario a '123456'? El usuario deberá cambiarla al iniciar sesión.")) {
      await resetPassword(id);
      alert("Contraseña restablecida exitosamente a '123456'.");
    }
  }

  const roleStyles: Record<string, { icon: any, color: string, label: string }> = {
    ADMIN: { icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/20", label: "Administrador" },
    ADMINISTRATION: { icon: Shield, color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Administración" },
    WEIGHER: { icon: UserIcon, color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", label: "Pesador" }
  };

  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "ADMINISTRATION";

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Rol</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium">Fecha Creación</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {initialUsers.map((user) => {
              const roleConfig = roleStyles[user.role] || roleStyles.WEIGHER;
              const RoleIcon = roleConfig.icon;
              const isCurrentUser = user.id === currentUserId;

              return (
                <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-200">{user.name}</div>
                    {isCurrentUser && <div className="text-xs text-emerald-400">Tú</div>}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${roleConfig.color}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      {roleConfig.label}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.status ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Activo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Inactivo
                        </div>
                      )}
                      {user.isLocked && (
                        <div className="flex items-center gap-1.5 text-rose-500 text-xs font-medium">
                          <Lock className="w-4 h-4" /> Bloqueado
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {user.isLocked && isAdmin && (
                        <button
                          onClick={() => handleUnlock(user.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" /> Desbloquear
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center gap-1"
                          title="Restablecer contraseña a 123456"
                        >
                          <KeyRound className="w-3 h-3" /> Restablecer
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        disabled={isCurrentUser}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          isCurrentUser 
                            ? "opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500"
                            : user.status 
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {user.status ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
