"use client";

// Simple notification sound (Ding/Ping) in Base64 (approx. 0.5s)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV1vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0zb29M29vTNvb0yb29Mm9vTIs6+vTIs6+shzr68MjLr69Mm9vTJvb0yb29Mm9vTIs6+vDIy6+vDIy6+shzr68MjLr69Mm9vTJvb0yb29Mm9vTIs6+vDIy6+vDIy6+shzr68MjLr69Mm9vTJvb0yb29Mm9vTIs6+vDIy6+vDIy6+v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v///v";

export function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.play().catch(e => console.warn("Erro ao tocar som de notificação (provavelmente requer interação prévia do usuário):", e));
  } catch (err) {
    console.error("Erro ao reproduzir som:", err);
  }
}
