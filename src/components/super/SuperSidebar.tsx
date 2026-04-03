"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ShoppingBag, LogOut, ShieldCheck, Globe, Users, Settings, Terminal, History, Headset, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { href: "/super", label: "Visão Geral", icon: LayoutGrid, exact: true },
  { href: "/super/restaurants", label: "Restaurantes", icon: Globe },
  { href: "/super/support", label: "Suporte Hub", icon: Headset },
  { href: "/super/terminal", label: "Terminal de Problemas", icon: Terminal },
  { href: "/super/tickets", label: "Histórico de Tickets", icon: History },
];

export function SuperSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 text-white font-outfit">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-6">
        <div className="bg-primary-theme p-2 rounded-xl shadow-lg shadow-primary-theme/20">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="text-lg font-black tracking-tight text-white leading-none">SaaS Manager</span>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Super Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300",
                active 
                  ? "bg-primary-theme text-white shadow-lg shadow-primary-theme/20" 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-zinc-500")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-800 p-4">
        <div className="rounded-3xl bg-white/5 p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-theme text-xs font-black text-white">
              {user?.name?.charAt(0) ?? "S"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-black text-white">{user?.name}</p>
              <p className="truncate text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Super Admin</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-black text-white hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do Gerenciador
          </button>
        </div>
      </div>
    </aside>
  );
}
