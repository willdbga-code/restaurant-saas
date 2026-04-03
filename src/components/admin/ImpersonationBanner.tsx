"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, Zap } from "lucide-react";

export function ImpersonationBanner() {
  const { user, impersonate_rest } = useAuth();
  const router = useRouter();

  if (user?.role !== "superadmin" || user.restaurant_id === "master") {
    return null;
  }

  const handleExit = () => {
    impersonate_rest(null);
    router.push("/super/restaurants");
  };

  return (
    <div className="bg-primary-theme px-4 py-2 text-white flex items-center justify-between shadow-lg z-50">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-[11px] font-black uppercase tracking-widest">
          Modo Gerenciamento SaaS: Você está visualizando este painel como suporte
        </span>
      </div>
      
      <button 
        onClick={handleExit}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
      >
        <ArrowLeft className="h-3 w-3" />
        Sair da Visualização
      </button>
    </div>
  );
}
