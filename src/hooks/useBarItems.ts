"use client";

import { useEffect, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { OrderItem, barItemsQuery } from "@/lib/firebase/orders";

export function useBarItems(
  restaurantId: string | undefined,
  onNewOrder?: () => void,
  onNewItems?: (items: OrderItem[]) => void,
) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bufferRef = useRef<OrderItem[]>([]);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBuffer = () => {
    if (bufferRef.current.length === 0) return;
    onNewItems?.(bufferRef.current);
    bufferRef.current = [];
  };

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }

    let unsubscribe: (() => void) | null = null;

    try {
      setLoading(true);
      let isFirstLoad = true;

      unsubscribe = onSnapshot(
        barItemsQuery(restaurantId),
        (snap) => {
          if (isFirstLoad) {
            isFirstLoad = false;
            const data = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as OrderItem))
              .sort((a, b) => (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0));
            setItems(data);
            setLoading(false);
            return;
          }

          if (!snap.metadata.hasPendingWrites) {
            snap.docChanges().forEach((change) => {
              if (change.type === "added") {
                const newItem = { id: change.doc.id, ...change.doc.data() } as OrderItem;
                onNewOrder?.();
                bufferRef.current.push(newItem);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(flushBuffer, 500);
              }
            });
          }

          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as OrderItem))
            .sort((a, b) => (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0));
          setItems(data);
          setLoading(false);
        },
        (err) => {
          console.error("useBarItems error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("useBarItems setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending   = items.filter((i) => i.status === "pending");
  const preparing = items.filter((i) => i.status === "preparing");
  const ready     = items.filter((i) => i.status === "ready");

  return { items, pending, preparing, ready, loading, error };
}
