"use client";

import Link from "next/link";
import { ChefHat, ArrowRight, Smartphone, LayoutDashboard, Utensils, Zap, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"essential" | "pro">("essential");

  const openCheckout = (planId: "essential" | "pro") => {
    setSelectedPlan(planId);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-white">
      
      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-lg shadow-orange-500/20">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">RestaurantOS</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
            <a href="#contact" className="hover:text-white transition-colors">Contato</a>
          </div>

          <Link 
            href="/login" 
            className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black hover:bg-zinc-200 transition-all active:scale-95"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8">
            <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">O Futuro das Operações chegou</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8">
            Crie o <span className="text-orange-500">Menu</span> que seu <br /> 
            cliente deseja.
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-zinc-400 mb-12">
            O primeiro sistema operacional para restaurantes que une um Cardápio Imersivo (estilo Instagram) com Gestão de Cozinha e PDV em uma única plataforma SaaS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login?register=true" 
              className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-lg font-black text-white hover:bg-orange-400 transition-all shadow-xl shadow-orange-500/20 active:scale-95"
            >
              Criar meu Restaurante <ArrowRight className="h-5 w-5" />
            </Link>
            <a 
              href="#features" 
              className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Ver Funcionalidades
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white uppercase">Tudo o que você precisa</h2>
            <p className="text-zinc-500">Operação ágil, sem papel e altamente rentável.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-orange-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Cardápio Instagram Style</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Seu menu em um PWA imersivo com fotos incríveis e navegação por scroll. Experiência de compra fluida que aumenta seu faturamento.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-blue-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">KDS Cozinha Real-time</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Elimine a bagunça de papéis. Seus cozinheiros visualizam pedidos instantaneamente em uma tela Kanban organizada e intuitiva.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-emerald-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Dashboard de Métricas</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Ticket Médio, Faturamento do Dia e Métodos de Pagamento. Tenha total controle financeiro e tome decisões baseadas em dados.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white/5 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
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
                  "Categorias & Produtos iliditados",
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
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-20 border-t border-white/5 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-black tracking-tighter uppercase">RestaurantOS</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-xs">A plataforma all-in-one para levar seu restaurante ao futuro digital.</p>
          </div>
          
          <div className="flex items-center gap-12 text-sm font-medium text-zinc-400">
             <a href="#" className="hover:text-white transition-colors">Termos</a>
             <a href="#" className="hover:text-white transition-colors">Privacidade</a>
             <a href="#" className="hover:text-white transition-colors text-zinc-500">© 2026 Studio SaaS.</a>
          </div>
        </div>
      </footer>

      <CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        planId={selectedPlan} 
        isAnnual={isAnnual}
      />
    </div>
  );
}
