"use client";

import { useState, useEffect } from "react";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { OrderPayment } from "@/lib/firebase/orders";

export function useOrderPayments(restaurantId: string | undefined, orderId: string | undefined) {
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !restaurantId) {
      if (!orderId) setPayments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "order_payments"),
      where("restaurant_id", "==", restaurantId),
      where("order_id", "==", orderId),
      orderBy("created_at", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderPayment));
      setPayments(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error loading payments:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [orderId, restaurantId]);

  return { payments, loading };
}
