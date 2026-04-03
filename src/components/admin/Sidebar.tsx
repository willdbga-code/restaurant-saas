"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Tag, ShoppingBag, TableProperties, ChefHat, LogOut, MonitorCheck, UtensilsCrossed, Settings, Users, Palette, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/pdv", label: "PDV", icon: MonitorCheck },
  { href: "/admin/kds", label: "KDS — Cozinha", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categorias", icon: Tag },
  { href: "/admin/products", label: "Produtos", icon: ShoppingBag },
  { href: "/admin/branding", label: "Identidade Visual", icon: Palette },
  { href: "/admin/tables", label: "Mesas", icon: TableProperties },
  { href: "/admin/staff", label: "Equipe", icon: Users },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
  { href: "/admin/billing", label: "Assinatura", icon: ShoppingBag },
];

import { NotificationFeed } from "./NotificationFeed";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 text-white">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-orange-400" />
          <span className="text-lg font-bold tracking-tight text-white leading-none">RestaurantOS</span>
        </div>
        <NotificationFeed restaurantId={user?.restaurant_id} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
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
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">{user?.role}</p>
          </div>
          <button onClick={logout} className="p-1 hover:bg-white/5 rounded-md transition-colors">
            <LogOut className="h-4 w-4 cursor-pointer text-zinc-500 hover:text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
}
