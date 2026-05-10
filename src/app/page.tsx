import Link from "next/link";
import { ChefHat, ArrowRight, Smartphone, Utensils, Zap, Users, TrendingUp, QrCode, GlassWater, Palette, Printer, TableProperties, Shield } from "lucide-react";
import { PricingSection } from "@/components/checkout/PricingSection";

export default function LandingPage() {
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

            {/* Feature 4 — QR Code Mesas */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-violet-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">QR Code por Mesa</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Cada mesa tem seu QR Code exclusivo. O cliente escaneia e já começa a pedir — sem esperar garçom, sem atrito.
              </p>
            </div>

            {/* Feature 5 — Bar Station */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-amber-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <GlassWater className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Estação do Bar</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Roteamento inteligente: bebidas vão direto para o bar, pratos para a cozinha. Cada estação vê apenas o que precisa preparar.
              </p>
            </div>

            {/* Feature 6 — Gestão de Equipe */}
            <div className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-pink-500/30 transition-all">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Equipe</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Convide garçons, cozinheiros e bartenders com permissões específicas. Cada membro vê apenas o que precisa — sem confusão.
              </p>
            </div>

          </div>

          {/* Second row — smaller feature pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {[
              { icon: Printer, label: "Impressão Térmica" },
              { icon: TableProperties, label: "Gestão de Mesas" },
              { icon: Palette, label: "Identidade Visual" },
              { icon: Shield, label: "Multi-Tenant Seguro" },
              { icon: Smartphone, label: "PWA Mobile" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-full bg-white/5 border border-white/5 px-5 py-2.5">
                <f.icon className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING (Client Component) ── */}
      <section id="pricing" className="py-24 bg-white/5 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <PricingSection />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="py-20 border-t border-white/5 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-black tracking-tighter uppercase">RestaurantOS</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-xs">A plataforma all-in-one para levar seu restaurante ao futuro digital.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 text-sm font-medium text-zinc-400">
            <div className="flex items-center gap-6">
              <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            </div>
            <a 
              href="mailto:contato@restaurantos.com.br" 
              className="hover:text-white transition-colors"
            >
              contato@restaurantos.com.br
            </a>
            <span className="text-zinc-600">© 2026 RestaurantOS.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
