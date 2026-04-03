"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Order, OrderItem, activeOrdersForTableQuery, orderItemsByOrderQuery, OrderStatus } from "@/lib/firebase/orders";

const ACTIVE: Order["status"][] = ["pending", "confirmed", "preparing", "ready", "delivered"];

export function useActiveOrder(restaurantId: string | undefined, tableId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId || !tableId) { setLoading(false); return; }
    setLoading(true);

    let unsubscribeItems: (() => void) | null = null;

    const unsubscribeOrder = onSnapshot(
      activeOrdersForTableQuery(restaurantId, tableId),
      (snap) => {
        const now = Date.now();
        const twelveHoursInMs = 12 * 60 * 60 * 1000;

        const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
        
        const active = orders
          .filter((o) => {
            const createdAt = o.created_at?.toMillis() ?? 0;
            const isRecent = (now - createdAt) < twelveHoursInMs;
            // Apenas ordens que não foram fechadas/canceladas ainda
            return ACTIVE.includes(o.status) && (o.items_count ?? 0) > 0 && isRecent;
          })
          .sort((a, b) => (b.created_at?.toMillis() ?? 0) - (a.created_at?.toMillis() ?? 0))[0] ?? null;
        
        setOrder(active);
        
        // Se temos um novo pedido ativo, ouvimos os itens dele em tempo real
        if (active) {
          if (unsubscribeItems) unsubscribeItems();
          unsubscribeItems = onSnapshot(orderItemsByOrderQuery(restaurantId, active.id), (itemSnap) => {
            setItems(itemSnap.docs.map(d => ({ id: d.id, ...d.data() }) as OrderItem));
          });
        } else {
          setItems([]);
        }
        
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); }
    );

    return () => {
      unsubscribeOrder();
      if (unsubscribeItems) unsubscribeItems();
    };
  }, [restaurantId, tableId]);

  // Lógica de Status Derivado (Para sincronismo KDS -> PWA Cliente)
  const getDerivedStatus = (): OrderStatus => {
    if (!order) return "pending";
    if (order.status === "closed" || order.status === "cancelled") return order.status;

    // Se algum item está pronto, o pedido está "Pronto" (ou pelo menos parcialmente pronto)
    // No nosso caso KDS, se o chef marcou um item como pronto, queremos que o cliente veja "Pronto"
    const hasReady = items.some(i => i.status === "ready");
    const hasPreparing = items.some(i => i.status === "preparing");

    if (hasReady) return "ready";
    if (hasPreparing) return "preparing";
    
    return order.status;
  };

  return { 
    order, 
    items,
    derivedStatus: getDerivedStatus(),
    loading, 
    error 
  };
}
