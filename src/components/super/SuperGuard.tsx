"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

export function SuperGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "superadmin")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary-theme" />
      </div>
    );
  }

  if (!user || user.role !== "superadmin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-center p-6 font-outfit">
        <div className="bg-red-500/10 p-6 rounded-3xl mb-6">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Acesso Restrito</h1>
        <p className="text-zinc-500 max-w-sm font-bold text-sm leading-relaxed mb-8">
          Esta área é reservada exclusivamente para o Gerente Global do SaaS. 
          Suas credenciais não possuem permissão de Super Admin.
        </p>
        <button 
          onClick={() => router.push("/login")}
          className="rounded-2xl bg-white text-black px-8 py-3 font-black text-sm active:scale-95 transition-all shadow-xl"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
