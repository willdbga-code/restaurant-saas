"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Order, ordersQueryByDate, PaymentMethod } from "@/lib/firebase/orders";

export type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

export type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  openOrders: number;
  closedOrders: number;
  cancelledOrders: number;
  averageTicket: number;
  paymentMethods: Record<PaymentMethod, number>;
  topProducts: TopProduct[];
};

const INITIAL_STATS: DashboardStats = {
  totalRevenue: 0,
  totalOrders: 0,
  openOrders: 0,
  closedOrders: 0,
  cancelledOrders: 0,
  averageTicket: 0,
  paymentMethods: {
    cash: 0,
    credit_card: 0,
    debit_card: 0,
    pix: 0,
    voucher: 0,
  },
  topProducts: [],
};

export function useDashboardStats(restaurantId: string | undefined, date: Date = new Date()) {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // Boundary calculations for the specific day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    setLoading(true);

    const unsubscribe = onSnapshot(
      ordersQueryByDate(restaurantId, startOfDay, endOfDay),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => doc.data() as Order);
        
        let revenue = 0;
        let open = 0;
        let closed = 0;
        const methods: Record<PaymentMethod, number> = {
          cash: 0, credit_card: 0, debit_card: 0, pix: 0, voucher: 0
        };

        for (const order of orders) {
          if (order.status === "closed" && order.payment_status === "paid") {
            revenue += order.total;
            closed++;
            if (order.payment_method) {
              methods[order.payment_method] = (methods[order.payment_method] || 0) + 1;
            }
          } else if (order.status !== "cancelled") {
            open++;
          }
        }

        const avgTicket = closed > 0 ? revenue / closed : 0;

        setStats({
          totalRevenue: revenue,
          totalOrders: orders.filter(o => o.status !== "cancelled").length,
          openOrders: open,
          closedOrders: closed,
          cancelledOrders: orders.filter(o => o.status === "cancelled").length,
          averageTicket: avgTicket,
          paymentMethods: methods,
          topProducts: [], // Will be populated by the items listener below
        });
        
        setLoading(false);
      },
      (err) => {
        console.error("useDashboardStats error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // ── Top Products query ──
    const itemsQuery = query(
      collection(db, "order_items"),
      where("restaurant_id", "==", restaurantId),
      where("created_at", ">=", Timestamp.fromDate(startOfDay)),
      where("status", "in", ["pending", "preparing", "ready", "delivered"]),
    );

    const unsubItems = onSnapshot(itemsQuery, (snap) => {
      const productMap = new Map<string, TopProduct>();
      snap.docs.forEach(d => {
        const data = d.data();
        const name = data.product_name as string;
        const qty = (data.quantity as number) || 0;
        const revenue = (data.total_price as number) || 0;
        const existing = productMap.get(name);
        if (existing) {
          existing.quantity += qty;
          existing.revenue += revenue;
        } else {
          productMap.set(name, { name, quantity: qty, revenue });
        }
      });
      const sorted = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      setStats(prev => ({ ...prev, topProducts: sorted }));
    });

    return () => {
      unsubscribe();
      unsubItems();
    };
  }, [restaurantId, date.toISOString().split("T")[0]]);

  return { stats, loading, error };
}
