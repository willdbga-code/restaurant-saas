"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { OrderItem, orderItemsByOrderQuery } from "@/lib/firebase/orders";

export function useOrderItems(restaurantId: string | undefined, orderId: string | undefined) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !restaurantId) { 
      if (!orderId) setItems([]); 
      setLoading(false); 
      return; 
    }
    setLoading(true);
    // EDGE CASE #1: cleanup obrigatório
    const unsubscribe = onSnapshot(
      orderItemsByOrderQuery(restaurantId, orderId),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as OrderItem)
          .filter((i) => i.status !== "cancelled")
          .sort((a, b) => (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0));
        setItems(data);
        setLoading(false);
      },
      (err) => { 
        console.error("useOrderItems error:", err);
        setError(err.message); 
        setLoading(false); 
      }
    );
    return () => unsubscribe();
  }, [orderId, restaurantId]);

  return { items, loading, error };
}
