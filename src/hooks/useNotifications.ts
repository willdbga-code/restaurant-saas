"use client";

import { useEffect, useState } from "react";
import { messaging } from "@/lib/firebase/config";
import { getToken, onMessage } from "firebase/messaging";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";

export function useNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!userId || !messaging) return;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === "granted") {
        // Obter o token FCM
        // Chave VAPID pública (Pegar do Console Firebase Cloud Messaging)
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          // Salvar o token no perfil do usuário para disparos de Cloud Functions
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            fcm_tokens: arrayUnion(token),
            updated_at: new Date()
          });
          
          console.log("Token FCM registrado com sucesso.");
        }
      }
    } catch (err) {
      console.error("Erro ao configurar Web Push:", err);
    }
  };

  // Listener para mensagens com o app aberto (Foreground)
  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Mensagem em Foreground:", payload);
        toast.info(payload.notification?.title || "Nova Notificação", {
          description: payload.notification?.body,
          duration: 10000,
        });
      });
      return () => unsubscribe();
    }
  }, []);

  return { permission, requestPermission };
}
