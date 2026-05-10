"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"essential" | "pro">("essential");

  const openCheckout = (planId: "essential" | "pro") => {
    setSelectedPlan(planId);
    setCheckoutOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 uppercase">Simples e <br/>Transparente</h2>
          <p className="text-zinc-400">Escala com o seu negócio. Sem taxas escondidas, sem asteriscos.</p>
        </div>
        <div className="bg-zinc-900 p-2 rounded-2xl inline-flex gap-2">
          <button 
            onClick={() => setIsAnnual(false)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black transition-all",
              !isAnnual ? "bg-orange-500 text-white shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Mensal
          </button>
          <button 
            onClick={() => setIsAnnual(true)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2",
              isAnnual ? "bg-orange-500 text-white shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Anual <span className="bg-white/10 px-2 py-0.5 rounded-md text-[10px]">-2 Meses</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Essential Plan */}
        <div className="rounded-[2.5rem] border border-white/5 bg-zinc-900 p-10 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] pointer-events-none" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">Plano Essencial</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-black">R$ {isAnnual ? "125" : "150"}</span>
            <span className="text-zinc-500 text-sm">/mês</span>
          </div>
          {isAnnual && <p className="text-zinc-500 text-xs font-bold mb-8">Cobrado anualmente (R$ 1.500)</p>}
          {!isAnnual && <div className="h-4 mb-8" />}

          <ul className="space-y-4 mb-10 flex-1">
            {[
              "Até 500 pedidos/mês",
              "Categorias & Produtos Ilimitados",
              "Cardápio Digital PWA",
              "Gestão Financeira básica",
              "Suporte por Email"
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-orange-500" /> {item}
              </li>
            ))}
          </ul>

          <button 
            onClick={() => openCheckout("essential")}
            className="w-full py-4 text-center rounded-2xl border border-white/10 font-black hover:bg-white/5 transition-colors"
          >
            Assinar Plano
          </button>
        </div>

        {/* Pro Plan */}
        <div className="rounded-[2.5rem] border-2 border-orange-500 bg-zinc-900 p-10 flex flex-col relative shadow-[0_0_50px_rgba(249,115,22,0.15)]">
           <div className="absolute top-6 right-10 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black text-white uppercase tracking-tighter">
             Recomendado
           </div>
          <h3 className="text-lg font-bold text-zinc-400 mb-2">Plano Premium Pro</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-black">R$ {isAnnual ? "250" : "300"}</span>
            <span className="text-zinc-500 text-sm">/mês</span>
          </div>
          {isAnnual && <p className="text-zinc-500 text-xs font-bold mb-8">Cobrado anualmente (R$ 3.000)</p>}
          {!isAnnual && <div className="h-4 mb-8" />}

          <ul className="space-y-4 mb-10 flex-1">
            {[
              "Pedidos Ilimitados",
              "KDS (Cozinha Profissional)",
              "Gestão de Staff (Equipe)",
              "Estatísticas Avançadas",
              "Domínio Customizado",
              "Suporte Priority 24/7"
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-zinc-200">
                <CheckCircle2 className="h-4 w-4 text-orange-500" /> {item}
              </li>
            ))}
          </ul>

          <button 
            onClick={() => openCheckout("pro")}
            className="w-full py-4 text-center rounded-2xl bg-orange-500 font-black text-white hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20"
          >
            Garantir meu Pro
          </button>
        </div>

      </div>

      <CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        planId={selectedPlan} 
        isAnnual={isAnnual}
      />
    </>
  );
}
