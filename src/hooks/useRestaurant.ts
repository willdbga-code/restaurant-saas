"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Restaurant } from "@/lib/firebase/firestore";

export function useRestaurant(restaurantId: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    let unsubscribe: (() => void) | null = null;

    try {
      setLoading(true);
      unsubscribe = onSnapshot(
        doc(db, "restaurants", restaurantId),
        (docSnap) => {
          if (docSnap.exists()) {
            setRestaurant({ id: docSnap.id, ...docSnap.data() } as Restaurant);
          } else {
            setRestaurant(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("useRestaurant error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("useRestaurant setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);

  return { restaurant, loading, error };
}
