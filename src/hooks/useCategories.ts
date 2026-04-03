"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Category, categoriesQuery } from "@/lib/firebase/firestore";

export function useCategories(restaurantId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
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
        categoriesQuery(restaurantId),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Category[];
          setCategories(data);
          setLoading(false);
        },
        (err) => {
          console.error("useCategories error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("useCategories setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);

  return { categories, loading, error };
}
