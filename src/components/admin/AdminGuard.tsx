"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { restaurant, loading: resLoading } = useRestaurant(user?.restaurant_id);
  const router = useRouter();
  const pathname = usePathname();

  const isBillingPage = pathname?.startsWith("/admin/billing");
  const isSuperAdmin = user?.role === "superadmin";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // Bloqueio de Assinatura Inativa
    // Se o restaurante estiver inativo e não estiver na página de cobrança, redireciona.
    // Super Admins e o próprio processo de carregamento inicial do restaurante não devem barrar.
    if (!authLoading && !resLoading && user && !isSuperAdmin && restaurant && !restaurant.is_active && !isBillingPage) {
      router.push("/admin/billing");
    }
  }, [user, authLoading, resLoading, restaurant, router, isBillingPage, isSuperAdmin]);

  // Se for Super Admin, não precisa esperar o carregamento do restaurante (ele não tem um)
  if (authLoading || (!isSuperAdmin && resLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) return null;

  // Se o usuário for um 'customer' que caiu por engano no admin
  if (user.role === "customer") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-center p-4">
        <h1 className="text-xl font-bold text-white mb-2">Acesso Negado</h1>
        <p className="text-zinc-400 max-w-sm mb-6">
          Você está logado como Cliente. Para acessar o painel administrativo, você precisa de uma conta de equipe.
        </p>
        <button 
          onClick={() => router.push("/login")}
          className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  // Se o restaurante estiver inativo, só permite ver a página de Billing
  if (!restaurant?.is_active && !isBillingPage) {
    return null; // O useEffect vai cuidar do redirect
  }

  return <>{children}</>;
}
