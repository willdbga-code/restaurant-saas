"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { 
  ArrowLeft, Zap, CreditCard, ShieldCheck, 
  ChevronRight, Star, Building2, Globe, Landmark
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { IntegrationModal } from "@/components/admin/IntegrationModal";

type Provider = "mercadopago" | "infinitepay" | "stone" | "santander";

export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { restaurant } = useRestaurant(user?.restaurant_id);
  
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openIntegration = (p: Provider) => {
    setSelectedProvider(p);
    setIsModalOpen(true);
  };

  const providers = [
    {
      id: "mercadopago" as Provider,
      name: "Mercado Pago",
      description: "O mais popular do Brasil. Ative PIX e Cartão em minutos.",
      icon: <Zap className="h-6 w-6" />,
      color: "bg-blue-500",
      isRecommended: true,
      tag: "Recomendado"
    },
    {
      id: "infinitepay" as Provider,
      name: "InfinitePay",
      description: "Taxas competitivas e liquidação rápida via Cloud API.",
      icon: <Zap className="h-6 w-6" />,
      color: "bg-emerald-500",
      tag: "Popular"
    },
    {
      id: "stone" as Provider,
      name: "Stone (Pagar.me)",
      description: "Robusto e ideal para grandes volumes de transação.",
      icon: <CreditCard className="h-6 w-6" />,
      color: "bg-green-600",
    },
    {
      id: "santander" as Provider,
      name: "Santander PIX",
      description: "Integração direta com sua conta empresarial Santander.",
      icon: <Landmark className="h-6 w-6" />,
      color: "bg-red-600",
    }
  ];

  if (!user || !restaurant) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Voltar para Configurações</span>
      </button>

      <div className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Hub de <span className="text-primary-theme">Integrações</span></h1>
        <p className="text-zinc-500 font-bold max-w-2xl">
          Conecte seu restaurante diretamente aos principais bancos e gateways. 
          O dinheiro cai direto na sua conta, sem intermediários.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p) => (
          <div 
            key={p.id}
            onClick={() => openIntegration(p.id)}
            className="group relative cursor-pointer glass-morphism border border-white/5 p-8 rounded-[2.5rem] hover:border-white/20 transition-all hover:scale-[1.02] overflow-hidden"
          >
            {/* Background Grain/Glow */}
            <div className={cn("absolute -top-24 -right-24 h-48 w-48 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity", p.color)} />
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className={cn("p-4 rounded-3xl text-white shadow-lg", p.color)}>
                     {p.icon}
                  </div>
                  {p.tag && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      p.isRecommended ? "bg-primary-theme text-black" : "bg-white/10 text-white"
                    )}>
                      {p.tag}
                    </span>
                  )}
               </div>

               <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{p.name}</h3>
               <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
                 {p.description}
               </p>

               <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4 text-green-500/50" />
                     <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Conexão Criptografada</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary-theme font-black text-xs group-hover:gap-2 transition-all">
                     Configurar
                     <ChevronRight className="h-4 w-4" />
                  </div>
               </div>
            </div>
          </div>
        ))}

        {/* Security Info Card */}
        <div className="md:col-span-2 bg-zinc-900/50 border border-dashed border-white/10 p-8 rounded-[2.5rem] mt-6">
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-20 w-20 flex-shrink-0 bg-white/5 rounded-full flex items-center justify-center">
                 <ShieldCheck className="h-10 w-10 text-zinc-500" />
              </div>
              <div>
                 <h4 className="text-white font-black text-lg mb-1 italic">Sobraneira Financeira SaaS</h4>
                 <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                   Nós não tocamos no seu dinheiro. Ao vincular sua própria API, as vendas são processadas 
                   pelo seu banco e o saldo migra direto para sua conta bancária empresarial. 
                   Suas chaves de acesso são armazenadas em um cofre blindado (Vault) impossível de ser lido por terceiros.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <IntegrationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        provider={selectedProvider!}
        restaurantId={restaurant.id!}
      />
    </div>
  );
}
