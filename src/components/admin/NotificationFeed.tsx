"use client";

import { useState, useEffect } from "react";
import { onSnapshot, collection, query, where, orderBy, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Bell, CreditCard, Users, CheckCircle2, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/firebase/orders";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NotificationFeed({ restaurantId }: { restaurantId: string | undefined }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white border-2 border-zinc-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Atividades</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] font-black text-orange-400 hover:text-orange-300 uppercase tracking-tight">
                  Limpar tudo
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-none py-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-600">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Nenhuma atividade recente.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = NOTIF_CONFIG[n.type];
                  const Icon = cfg.icon;
                  return (
                    <div 
                      key={n.id} 
                      className={cn(
                        "relative flex gap-3 p-4 rounded-xl transition-colors cursor-default",
                        !n.is_read ? "bg-white/[0.03]" : "opacity-60"
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
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                          {n.created_at?.toDate().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-2 border-t border-zinc-900 mt-2">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="w-full py-2 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                 Fechar
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
