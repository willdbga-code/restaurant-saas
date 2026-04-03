"use client";

import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Check, Loader2, Zap, ShieldCheck, Rocket, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";

const PLANS = [
  {
    id: "essential",
    name: "Essencial",
    price: "R$ 150",
    description: "Ideal para começar.",
    features: ["Até 500 pedidos/mês", "Cardápio Digital PWA", "Gestão Financeira", "Dashboard Mobile"],
    color: "zinc",
  },
  {
    id: "pro",
    name: "Premium Pro",
    price: "R$ 300",
    description: "Para operações completas.",
    features: ["Pedidos Ilimitados", "KDS (Cozinha)", "Gestão de Staff", "Estoque Avançado", "Suporte VIP"],
    color: "orange",
    recommended: true,
  }
];

export default function BillingPage() {
  const { user } = useAuth();
  const { restaurant, loading } = useRestaurant(user?.restaurant_id);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"essential" | "pro">("essential");
  const [isAnnual, setIsAnnual] = useState(false);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
    </div>
  );

  const isAdmin = user?.role === "admin";
  const currentPlan = restaurant?.plan_type || "free";
  const isSubscribed = restaurant?.subscription_status === "active";

  const handleSubscribe = (planId: "essential" | "pro") => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem gerenciar a assinatura.");
      return;
    }
    setSelectedPlan(planId);
    setCheckoutOpen(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Minha Assinatura</h1>
          <p className="text-zinc-500 mt-2">Gerencie o plano do seu restaurante e faturamento.</p>
        </div>

        <div className="bg-zinc-900 p-1.5 rounded-2xl inline-flex gap-1 border border-white/5">
          <button 
            onClick={() => setIsAnnual(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all",
              !isAnnual ? "bg-orange-500 text-white shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Mensal
          </button>
          <button 
            onClick={() => setIsAnnual(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all",
              isAnnual ? "bg-orange-500 text-white shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Anual (-2 Meses)
          </button>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="mb-12 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Status da Conta</h2>
              <Badge variant={isSubscribed ? "default" : "secondary"} className={cn(isSubscribed ? "bg-green-500/10 text-green-400" : "")}>
                {isSubscribed ? "Assinatura Ativa" : "Pendente de Pagamento"}
              </Badge>
            </div>
            <p className="text-zinc-400 text-sm mt-1">Plano Atual: <span className="text-white font-bold uppercase">{currentPlan === 'free' ? 'Demonstração' : currentPlan}</span></p>
          </div>
        </div>

        {isSubscribed && (
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <CreditCard className="h-4 w-4 mr-2" /> Gerenciar no Portal de Faturamento
          </Button>
        )}
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {PLANS.map((plan) => {
          const isCurrent = restaurant?.plan_type === plan.id && isSubscribed;
          const isPro = plan.id === 'pro';

          return (
            <div 
              key={plan.id}
              className={cn(
                "rounded-[2.5rem] border p-10 flex flex-col transition-all duration-300",
                plan.recommended ? "border-orange-500 bg-zinc-900 shadow-[0_0_50px_rgba(249,115,22,0.1)]" : "border-zinc-800 bg-zinc-900/30 grayscale-[50%] hover:grayscale-0",
                isCurrent && "border-green-500 grayscale-0 ring-4 ring-green-500/5"
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm">{plan.description}</p>
                </div>
                {plan.recommended && (
                  <Badge className="bg-orange-500 text-white font-black text-[10px] uppercase">Melhor Escolha</Badge>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-white">R$ {isAnnual ? (plan.id === 'pro' ? '250' : '125') : (plan.id === 'pro' ? '300' : '150')}</span>
                <span className="text-zinc-500 text-sm">/mês</span>
              </div>
              {isAnnual && <p className="text-zinc-400 text-xs font-bold mb-6">Cobrado anualmente (R$ {plan.id === 'pro' ? '3.000' : '1.500'})</p>}
              {!isAnnual && <div className="h-4 mb-6" />}

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className={cn("h-4 w-4", isPro ? "text-orange-500" : "text-zinc-400")} /> {feat}
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleSubscribe(plan.id as "essential" | "pro")}
                disabled={isCurrent}
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-lg transition-all",
                  isCurrent ? "bg-green-500 text-white cursor-default" : 
                  isPro ? "bg-orange-500 text-white hover:bg-orange-400" : 
                  "bg-white text-black hover:bg-zinc-200"
                )}
              >
                {isCurrent ? "Plano Atual" : `Assinar ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center">
         <p className="text-zinc-500 text-xs">
           Pagamentos processados com segurança via SSL 256 bits. <br/>
           Dúvidas? Entre em contato com nosso suporte financeiro.
         </p>
      </div>
      <CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        planId={selectedPlan} 
        restaurantId={restaurant?.id}
        isAnnual={isAnnual}
      />
    </div>
  );
}
