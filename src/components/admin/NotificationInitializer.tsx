"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Bell, Zap, X } from "lucide-react";
import { toast } from "sonner";

export function NotificationInitializer() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotifications(user?.uid);

  useEffect(() => {
    // Se o usuário logou e ainda não deu permissão, mostramos um pequeno lembrete não intrusivo
    if (user && permission === "default") {
      toast("🛎️ Ativar Alertas em Tempo Real?", {
        description: "Receba notificações de novos pedidos e pagamentos no seu dispositivo.",
        action: {
          label: "Ativar Agora",
          onClick: () => requestPermission(),
        },
        duration: 15000,
      });
    }
  }, [user, permission]);

  return null; // Componente invisível de lógica
}
