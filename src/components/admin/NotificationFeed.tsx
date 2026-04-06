"use client";

import { useState, useEffect } from "react";
import { onSnapshot, collection, query, where, orderBy, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, CreditCard, Users, CheckCircle2, Lock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/firebase/orders";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NotificationFeed({ restaurantId }: { restaurantId: string | undefined }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!restaurantId) return;

    const q = query(
      collection(db, "notifications"),
      where("restaurant_id", "==", restaurantId),
      orderBy("created_at", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(docs);
    });

    return () => unsub();
  }, [restaurantId]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { is_read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await updateDoc(doc(db, "notifications", n.id), { is_read: true });
    }
  };

  const NOTIF_CONFIG: Record<Notification["type"], { icon: any, color: string, label: string }> = {
    payment_started: { icon: Users, color: "text-blue-400 bg-blue-500/10", label: "Divisão iniciada" },
    payment_partial: { icon: CreditCard, color: "text-orange-400 bg-orange-500/10", label: "Pagamento parcial" },
    payment_completed: { icon: CheckCircle2, color: "text-green-400 bg-green-500/10", label: "Mesa liquidada" },
    table_opening_request: { icon: Lock, color: "text-red-400 bg-red-500/10", label: "Abertura de Mesa" },
    order_created: { icon: ShoppingBag, color: "text-purple-400 bg-purple-500/10", label: "Novo Pedido" },
  };

  return (
    <Dialog>
      <DialogTrigger 
        render={
          <button 
            className="relative rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white border-2 border-zinc-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        }
      />

      <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-zinc-900 flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold text-white uppercase tracking-widest">Atividades Recentes</DialogTitle>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[10px] font-black text-orange-400 hover:text-orange-300 uppercase tracking-tight pr-8">
              Limpar tudo
            </button>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-none py-2">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-zinc-600">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Nenhuma atividade recente.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.order_created;
              const Icon = cfg.icon;
              return (
                <div 
                  key={n.id} 
                  className={cn(
                    "relative flex gap-3 p-4 hover:bg-white/[0.02] transition-colors cursor-default",
                    !n.is_read ? "bg-white/[0.04]" : "opacity-60"
                  )}
                  onMouseEnter={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800", cfg.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-black text-white uppercase tracking-tight">{cfg.label}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 mt-1" />}
                    </div>
                    <p className="text-[13px] text-zinc-400 mt-1">
                      <span className="font-bold text-zinc-200">{n.table_label}</span> 
                      {n.type === "payment_partial" && ` pagou ${fmt(n.amount || 0)}`}
                      {n.type === "payment_completed" && ` finalizou a conta`}
                      {n.type === "payment_started" && ` abriu divisão de conta`}
                      {n.type === "table_opening_request" && ` solicitou liberação de acesso`}
                      {n.type === "order_created" && ` enviou um novo pedido`}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                      {n.created_at?.toDate?.() ? n.created_at.toDate().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : "Agora"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
