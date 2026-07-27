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
  UserCog,
  Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileMenu } from "./MobileMenuContext";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";

const menuCategories = [
  {
    title: "OPERATIVO",
    items: [
      { icon: Store, label: "Compras (Lotes)", href: "/operaciones/lotes", roles: ["ADMIN", "ADMINISTRATION", "WEIGHER"] },
      { icon: Factory, label: "Faena", href: "/operaciones/faena", roles: ["ADMIN", "ADMINISTRATION", "WEIGHER"] },
      { icon: Beef, label: "Inventario", href: "/inventario", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: CircleDollarSign, label: "Ventas", href: "/operaciones/ventas", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: CircleDollarSign, label: "Gastos", href: "/operaciones/gastos", roles: ["ADMIN", "ADMINISTRATION", "WEIGHER"] },
    ]
  },
  {
    title: "FINANZAS",
    items: [
      { icon: ArrowRightLeft, label: "Bancos y Cajas", href: "/operaciones/finanzas/bancos", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Wallet, label: "Cuentas por Cobrar", href: "/operaciones/finanzas/cuentas-cobrar", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Wallet, label: "Cuentas por Pagar", href: "/operaciones/finanzas/cuentas-pagar", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: CircleDollarSign, label: "Cartera Cheques", href: "/operaciones/finanzas/cheques", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Landmark, label: "Préstamos", href: "/operaciones/finanzas/prestamos", roles: ["ADMIN"] },
    ]
  },
  {
    title: "DEFINICIONES",
    items: [
      { icon: Users, label: "Clientes", href: "/terceros/clientes", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Users, label: "Proveedores", href: "/terceros/proveedores", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Settings, label: "Cat. Gastos", href: "/configuracion/gastos", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: Settings, label: "Artículos", href: "/configuracion/articulos", roles: ["ADMIN", "ADMINISTRATION"] },
      { icon: UserCog, label: "Usuarios", href: "/configuracion/usuarios", roles: ["ADMIN"] },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();
  const { data: session } = useSession();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userRole = session?.user?.role || "WEIGHER";

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

      <nav className="flex-1 px-4 space-y-4 overflow-y-auto pb-4">
        {/* Dashboard siempre visible arriba si tiene rol */}
        {["ADMIN", "ADMINISTRATION"].includes(userRole) && (
          <Link href="/" className="block relative">
            {pathname === "/" && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
            }`}>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </div>
          </Link>
        )}

        {menuCategories.map((category) => {
          const allowedItems = category.items.filter(item => item.roles.includes(userRole));
          if (allowedItems.length === 0) return null;

          return (
            <div key={category.title} className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-zinc-500 tracking-wider mb-2">{category.title}</h3>
              {allowedItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                
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
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 flex justify-between items-center gap-2">
          <div className="overflow-hidden flex-1">
            <p className="text-xs text-zinc-400">{userRole}</p>
            <p className="text-sm text-zinc-200 font-medium truncate">{session?.user?.name || "Usuario"}</p>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex-shrink-0"
              title="Cambiar Contraseña"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </button>
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
    </div>
    
    <ChangePasswordModal 
      isOpen={isPasswordModalOpen} 
      onClose={() => setIsPasswordModalOpen(false)} 
    />
    </>
  );
}
