"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Beef,
  CircleDollarSign,
  Settings,
  Store,
  Wallet,
  ArrowRightLeft,
  Factory,
  X,
  LogOut,
  UserCog
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileMenu } from "./MobileMenuContext";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";

const allMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Store, label: "Compras (Lotes)", href: "/operaciones/lotes", roles: ["ADMIN", "ADMINISTRATION", "WEIGHER"] },
  { icon: Factory, label: "Faena", href: "/operaciones/faena", roles: ["ADMIN", "ADMINISTRATION", "WEIGHER"] },
  { icon: CircleDollarSign, label: "Ventas", href: "/operaciones/ventas", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Beef, label: "Inventario", href: "/inventario", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: ArrowRightLeft, label: "Finanzas (Bancos)", href: "/operaciones/finanzas/bancos", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Wallet, label: "Cuentas por Cobrar", href: "/operaciones/finanzas/cuentas-cobrar", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: CircleDollarSign, label: "Cartera Cheques", href: "/operaciones/finanzas/cheques", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Users, label: "Clientes", href: "/terceros/clientes", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Users, label: "Proveedores", href: "/terceros/proveedores", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Settings, label: "Gastos", href: "/configuracion/gastos", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: Settings, label: "Artículos", href: "/configuracion/articulos", roles: ["ADMIN", "ADMINISTRATION"] },
  { icon: UserCog, label: "Usuarios", href: "/configuracion/usuarios", roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();
  const { data: session } = useSession();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userRole = session?.user?.role || "WEIGHER";
  
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out
    md:relative md:translate-x-0
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
  `;

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={close}
        />
      )}
      
      <div className={sidebarClasses}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              FFH Asociados
            </h2>
            <p className="text-zinc-500 text-xs mt-1 font-medium tracking-wider uppercase">ERP System</p>
          </div>
          <button onClick={close} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
              }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 flex justify-between items-center">
          <div className="overflow-hidden cursor-pointer" onClick={() => setIsPasswordModalOpen(true)}>
            <p className="text-xs text-zinc-400">{userRole}</p>
            <p className="text-sm text-zinc-200 font-medium truncate hover:text-emerald-400 transition-colors">{session?.user?.name || "Usuario"}</p>
          </div>
          <button 
            onClick={() => signOut()} 
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    
    <ChangePasswordModal 
      isOpen={isPasswordModalOpen} 
      onClose={() => setIsPasswordModalOpen(false)} 
    />
    </>
  );
}
