"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Table, tablesQuery } from "@/lib/firebase/firestore";

export function useTables(restaurantId: string | undefined) {
  const [tables, setTables] = useState<Table[]>([]);
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
        tablesQuery(restaurantId),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Table[];
          setTables(data);
          setLoading(false);
        },
        (err) => {
          console.error("useTables error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("useTables setup error:", err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);

  return { tables, loading, error };
}
