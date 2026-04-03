"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Product, productsQuery } from "@/lib/firebase/firestore";

export function useProducts(restaurantId: string | undefined) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    
    try {
      setLoading(true);
      unsubscribe = onSnapshot(
        productsQuery(restaurantId),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];
          setProducts(data);
          setLoading(false);
        },
        (err) => {
          console.error("useProducts error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("useProducts setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);

  return { products, loading, error };
}
