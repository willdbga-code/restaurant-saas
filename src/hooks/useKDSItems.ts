"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { OrderItem, kdsItemsQuery } from "@/lib/firebase/orders";

export function useKDSItems(restaurantId: string | undefined) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    
    let unsubscribe: (() => void) | null = null;

    try {
      setLoading(true);
      unsubscribe = onSnapshot(
        kdsItemsQuery(restaurantId),
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as OrderItem))
            .sort((a, b) => (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0));
          setItems(data);
          setLoading(false);
        },
        (err) => { 
          console.error("useKDSItems error:", err);
          setError(err.message); 
          setLoading(false); 
        }
      );
    } catch (err: any) {
      console.error("useKDSItems setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);

  const pending   = items.filter((i) => i.status === "pending");
  const preparing = items.filter((i) => i.status === "preparing");
  const ready     = items.filter((i) => i.status === "ready");

  return { items, pending, preparing, ready, loading, error };
}
