"use client";

import { X, Clock, Utensils, CheckCircle2, Zap, PackageCheck } from "lucide-react";
import { Order, OrderItem, OrderStatus } from "@/lib/firebase/orders";
import { cn } from "@/lib/utils";

interface OrderDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment?: () => void;
  order: Order | null;
  items: OrderItem[];
  derivedStatus: OrderStatus;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrderDetailsDrawer({ isOpen, onClose, onOpenPayment, order, items, derivedStatus }: OrderDetailsDrawerProps) {
  if (!order) return null;

  const statusMap: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pending: { label: "Aguardando", icon: Clock, color: "text-zinc-500", bg: "bg-zinc-500/10" },
    confirmed: { label: "Confirmado", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
    preparing: { label: "Na Cozinha", icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/10" },
    ready: { label: "Pronto!", icon: Zap, color: "text-green-500", bg: "bg-green-500/10" },
  };

  const remaining = order.total - (order.amount_paid || 0);
  const isFullyPaid = remaining <= 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[60] bg-black/70 backdrop-blur-md transition-opacity duration-500",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[60] flex flex-col max-h-[85vh] rounded-t-[3rem] glass-morphism-heavy border-t border-white/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-full flex justify-center py-5">
          <div className="w-14 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="px-8 pb-8 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-black text-white tracking-tight leading-none">Pedido #{String(order.order_number).padStart(4, '0')}</h2>
            <button onClick={onClose} className="rounded-2xl bg-white/5 p-3 text-zinc-500 active:scale-90 transition-transform">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em]", statusMap[derivedStatus]?.bg, statusMap[derivedStatus]?.color)}>
              {statusMap[derivedStatus]?.label}
            </div>
            <span className="text-zinc-600 text-[11px] uppercase font-black tracking-widest">• {order.table_label ?? "Balcão"}</span>
            {order.amount_paid > 0 && (
              <span className="text-green-500 text-[11px] font-black uppercase tracking-widest bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/10">
                Pago: {fmt(order.amount_paid)}
              </span>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-none">
          <div>
            <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Seus Itens ({items.length})</h3>
            <div className="space-y-6">
              {items.map((item, idx) => {
                const currentStatus = statusMap[item.status] || statusMap.pending;
                const Icon = currentStatus.icon;
                
                return (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-[1.5rem] border transition-all",
                        item.status === 'ready' ? "bg-green-500/20 border-green-500/30 text-green-500" : 
                        item.status === 'preparing' ? "bg-orange-500/20 border-orange-500/30 text-orange-400" :
                        "bg-white/5 border-white/5 text-zinc-600"
                      )}>
                        <Icon className={cn("h-7 w-7", item.status === 'preparing' && "animate-pulse")} />
                      </div>
                      <div>
                        <p className="text-[17px] font-black text-white mb-0.5 tracking-tight">{item.quantity}x {item.product_name}</p>
                        <p className={cn("text-[11px] font-black uppercase tracking-widest", currentStatus.color)}>
                          {currentStatus.label}
                        </p>
                      </div>
                    </div>
                    <span className="text-[17px] font-black text-white/30 tracking-tight">{fmt(item.total_price)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 mb-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Total do Pedido</span>
                <span className="text-4xl font-black text-white tracking-tighter">{fmt(order.total)}</span>
              </div>
              {order.amount_paid > 0 && !isFullyPaid && (
                <div className="text-right">
                   <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest block mb-2">A Pagar</span>
                   <span className="text-2xl font-black text-orange-500 tracking-tight">{fmt(remaining)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-black/20 flex flex-col gap-4">
          {!isFullyPaid && onOpenPayment && (
            <button 
              onClick={onOpenPayment}
              className="btn-modern btn-orange-glow w-full py-5 rounded-3xl text-lg font-black"
            >
              <PackageCheck className="h-6 w-6" /> Pagar a Conta
            </button>
          )}

          <button 
            onClick={onClose}
            className="btn-modern w-full bg-white/5 border border-white/10 py-5 rounded-3xl text-sm font-black text-zinc-500 active:scale-95 transition-all"
          >
            Fechar detalhes
          </button>
        </div>
      </div>
    </>
  );
}
