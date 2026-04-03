"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { AppUser, staffQuery } from "@/lib/firebase/firestore";

export function useStaff(restaurantId: string | undefined) {
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    setLoading(true);
    const unsubscribe = onSnapshot(
      staffQuery(restaurantId),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
        })) as AppUser[];
        setStaff(data);
        setLoading(false);
      },
      (err) => {
        console.error("useStaff error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { staff, loading, error };
}
