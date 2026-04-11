"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Tag, ShoppingBag, TableProperties, ChefHat, LogOut, MonitorCheck, UtensilsCrossed, Settings, Users, Palette, ShieldCheck, BarChart3, GlassWater } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// Links base — visíveis para todos os roles com acesso ao painel
const baseNav = [
  { href: "/admin",              label: "Dashboard",        icon: LayoutGrid,       exact: true },
  { href: "/admin/pdv",          label: "PDV",              icon: MonitorCheck },
  { href: "/admin/categories",   label: "Categorias",       icon: Tag },
  { href: "/admin/products",     label: "Produtos",         icon: ShoppingBag },
  { href: "/admin/branding",     label: "Identidade Visual", icon: Palette },
  { href: "/admin/tables",       label: "Mesas",            icon: TableProperties },
  { href: "/admin/staff",        label: "Equipe",           icon: Users },
  { href: "/admin/settings",     label: "Configurações",    icon: Settings },
  { href: "/admin/billing",      label: "Assinatura",       icon: ShoppingBag },
  { href: "/admin/sales-report", label: "Relatório de Vendas", icon: BarChart3 },
];

import { NotificationFeed } from "./NotificationFeed";
import { useNotifications } from "@/hooks/useNotifications";
import { BellRing, BellOff } from "lucide-react";

export function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { permission, requestPermission } = useNotifications(user?.uid);

  // Monta a nav dinamicamente por role
  const role = user?.role;
  const nav = [...baseNav];

  // Insere KDS Cozinha logo após PDV para admin e kitchen
  if (role === "admin" || role === "kitchen") {
    const pdvIdx = nav.findIndex((n) => n.href === "/admin/pdv");
    nav.splice(pdvIdx + 1, 0, { href: "/admin/kds", label: "KDS — Cozinha", icon: UtensilsCrossed, exact: false } as any);
  }

  // Insere KDS Bar logo após KDS Cozinha (ou PDV se cozinha não estiver) para admin e bar
  if (role === "admin" || role === "bar") {
    const kdsIdx = nav.findIndex((n) => n.href === "/admin/kds");
    const insertAfter = kdsIdx >= 0 ? kdsIdx : nav.findIndex((n) => n.href === "/admin/pdv");
    nav.splice(insertAfter + 1, 0, { href: "/admin/bar", label: "KDS — Bar 🍸", icon: GlassWater, exact: false } as any);
  }


  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-orange-400" />
          <span className="text-lg font-bold tracking-tight text-white leading-none">RestaurantOS</span>
        </div>
        <NotificationFeed restaurantId={user?.restaurant_id} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-orange-500/10 text-orange-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        {/* Global Manager Shortcut for Super Admin */}
        {user?.role === "superadmin" && (
          <div className="pt-4 border-t border-zinc-800 mt-4 px-2">
            <Link
               href="/super"
               className="flex items-center gap-3 rounded-xl px-4 py-3 bg-primary-theme text-white text-xs font-black uppercase tracking-tight shadow-lg shadow-primary-theme/20 hover:scale-105 transition-all active:scale-95"
            >
               <ShieldCheck className="h-4 w-4" />
               SaaS Manager
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">{user?.role}</p>
          </div>
          <button onClick={logout} className="p-1 hover:bg-white/5 rounded-md transition-colors">
            <LogOut className="h-4 w-4 cursor-pointer text-zinc-500 hover:text-white" />
          </button>
        </div>
        
        {/* Notification Permission Prompt */}
        {permission === "default" && (
          <button 
            onClick={requestPermission}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-500/20 transition-all border border-orange-500/20 shadow-lg shadow-orange-500/5 animate-pulse"
          >
            <BellRing className="h-3 w-3" />
            Ativar Notificações
          </button>
        )}
        {permission === "denied" && (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 border border-zinc-800">
            <BellOff className="h-3 w-3" />
            Notificações Bloqueadas
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <SidebarContent />
    </aside>
  );
}

