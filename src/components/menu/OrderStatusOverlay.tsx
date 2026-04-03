"use client";

import { Clock, ChefHat, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { OrderStatus } from "@/lib/firebase/orders";
import { cn } from "@/lib/utils";

interface OrderStatusOverlayProps {
  status: OrderStatus;
  orderNumber: number;
  onClick: () => void;
}

export function OrderStatusOverlay({ status, orderNumber, onClick }: OrderStatusOverlayProps) {
  const statusConfig: Record<OrderStatus, { label: string; icon: any; color: string; bg: string; glow: string }> = {
    pending: { label: "Aguardando confirmação", icon: Clock, color: "text-zinc-400", bg: "bg-zinc-500/20", glow: "shadow-zinc-500/10" },
    confirmed: { label: "Pedido confirmado", icon: CheckCircle2, color: "text-white", bg: "bg-blue-500/30", glow: "shadow-blue-500/20" },
    preparing: { label: "Sendo preparado", icon: ChefHat, color: "text-white", bg: "bg-orange-500/40", glow: "shadow-orange-500/30" },
    ready: { label: "Pronto para retirar", icon: Zap, color: "text-green-400", bg: "bg-green-500/40", glow: "shadow-green-500/40" },
    delivered: { label: "Pedido entregue", icon: CheckCircle2, color: "text-zinc-400", bg: "bg-zinc-800", glow: "" },
    cancelled: { label: "Pedido cancelado", icon: Clock, color: "text-red-400", bg: "bg-red-500/20", glow: "shadow-red-500/20" },
    closed: { label: "Conta fechada", icon: Clock, color: "text-zinc-400", bg: "bg-zinc-800", glow: "" },
  };

  const current = statusConfig[status] || statusConfig.pending;
  const Icon = current.icon;

  if (status === "closed") return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-6 animate-in slide-in-from-bottom-10 duration-700">
      <button 
        onClick={onClick}
        className={cn(
          "glass-morphism group flex w-full max-w-sm items-center justify-between rounded-[2.5rem] p-2.5 pl-6 pr-2.5 transition-all active:scale-[0.97] hover:scale-[1.02]",
          current.glow,
          status === 'ready' ? "border-green-500/40 shadow-green-500/20" : "border-white/10"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[1.5rem] shadow-inner transition-all",
            status === 'ready' ? "bg-green-500 text-white animate-pulse" : "bg-white/10 text-white"
          )}>
            <Icon className={cn("h-7 w-7", status === 'preparing' && "animate-bounce-slow text-orange-400")} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Status do Pedido</p>
            <p className={cn("text-[15px] font-black tracking-tight", current.color)}>
              {current.label}
            </p>
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 group-active:bg-white/10 transition-colors">
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
      </button>
    </div>
  );
}
