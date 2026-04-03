"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection, query, orderBy, doc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Restaurant } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Globe, ShieldCheck, Zap, ExternalLink, Power, Calendar, Search, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { RestaurantLiveMetrics } from "@/components/super/RestaurantLiveMetrics";
import { calculatePlanPricing, PlanTier } from "@/lib/utils/pricing";

export default function SuperRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pulseStats, setPulseStats] = useState<any>({ total_restaurants: 0, active_restaurants: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { impersonate_rest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 1. Monitorar Estatísticas Globais (Pulse)
    const unsubPulse = onSnapshot(doc(db, "metadata", "system"), (snap) => {
      if (snap.exists()) {
        setPulseStats(snap.data());
      }
    });

    // 2. Monitorar Lista de Restaurantes
    const q = query(collection(db, "restaurants"), orderBy("created_at", "desc"));
    const unsubList = onSnapshot(q, (snap) => {
      setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant)));
      setLoading(false);
    });

    return () => {
      unsubPulse();
      unsubList();
    };
  }, []);

  // 3. Auto-Bootstrap dos Metadados (Apenas se estiverem vazios e carregarmos a lista)
  useEffect(() => {
    if (!loading && restaurants.length > 0 && pulseStats.total_restaurants === 0) {
      const systemRef = doc(db, "metadata", "system");
      const active = restaurants.filter(r => r.is_active).length;
      
      setDoc(systemRef, {
        total_restaurants: restaurants.length,
        active_restaurants: active,
        updated_at: Timestamp.now()
      }, { merge: true }).catch(err => console.error("Pulse Bootstrap Error:", err));
    }
  }, [loading, restaurants, pulseStats.total_restaurants]);

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "restaurants", id), { is_active: !current });
    } catch (err) {
      console.error("Erro ao alterar status", err);
    }
  };

  const handleAccess = (restId: string) => {
     impersonate_rest(restId);
     router.push("/admin/pdv");
  };

  const filtered = restaurants.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Cálculos de Resumo (Pulse)
  const totalMRR = restaurants.filter(r => r.is_active).reduce((acc, r) => {
    const p = calculatePlanPricing((r.plan_type as PlanTier) || "free");
    return acc + p.actualPrice;
  }, 0);

  const totalProfit = restaurants.filter(r => r.is_active).reduce((acc, r) => {
    const p = calculatePlanPricing((r.plan_type as PlanTier) || "free");
    return acc + p.netProfit;
  }, 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="flex items-center justify-between">
        <div>
           <h1 className="text-4xl font-black tracking-tight text-white mb-2">Comandante <span className="text-primary-theme">SaaS</span></h1>
           <p className="text-zinc-500 font-bold">Monitoramento de infraestrutura, faturamento e suporte em tempo real.</p>
        </div>
        <div className="relative w-80 group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary-theme transition-colors" />
           <input 
              type="text" 
              placeholder="Buscar cliente, slug ou plano..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-theme/50 transition-all placeholder:text-zinc-600 shadow-2xl"
           />
        </div>
      </header>

      {/* SaaS Pulse Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="glass-morphism border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <DollarSign className="h-16 w-16 text-white" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Faturamento (MRR)</p>
            <p className="text-3xl font-black text-white tracking-tighter">{(totalMRR / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            <div className="mt-4 flex items-center gap-2">
               <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-theme w-[75%]" />
               </div>
               <span className="text-[10px] font-black text-zinc-600">75%</span>
            </div>
         </div>

         <div className="glass-morphism border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Zap className="h-16 w-16 text-white" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Lucro Líquido Real</p>
            <p className="text-3xl font-black text-primary-theme tracking-tighter">{(totalProfit / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase tracking-tight">Após descontar SAC e Cloud</p>
         </div>

         <div className="glass-morphism border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Globe className="h-16 w-16 text-white" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Clientes Ativos</p>
            <p className="text-3xl font-black text-white tracking-tighter">{pulseStats.active_restaurants || 0}</p>
            <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase tracking-tight">Total de {pulseStats.total_restaurants || 0} cadastros</p>
         </div>

         <div className="glass-morphism border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldCheck className="h-16 w-16 text-white" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Status Plataforma</p>
            <div className="flex items-center gap-2 mt-2">
               <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
               <p className="text-xl font-black text-white tracking-tighter uppercase">Operacional</p>
            </div>
            <p className="text-[9px] text-green-500/60 font-black mt-3 uppercase tracking-widest">Sistemas 100% On-line</p>
         </div>
      </div>

      <div className="glass-morphism-heavy rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-16 text-center">Info</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Restaurante</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Cadastro</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Plano</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <React.Fragment key={r.id}>
                  <tr 
                    onClick={() => setExpandedId(isExpanded ? null : r.id!)}
                    className={cn(
                      "hover:bg-white/[0.02] transition-colors group cursor-pointer border-l-4 border-transparent",
                      isExpanded && "bg-white/[0.04] border-primary-theme"
                    )}
                  >
                    <td className="px-8 py-6 text-center">
                       {isExpanded ? (
                         <div className="bg-primary-theme/20 p-2 rounded-xl border border-primary-theme/20">
                            <ChevronUp className="h-4 w-4 text-primary-theme" />
                         </div>
                       ) : (
                         <ChevronDown className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-y-0.5" />
                       )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 text-white">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover border border-white/5 shadow-lg shadow-black/20" />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-zinc-600 font-bold" />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-white text-lg tracking-tight leading-none mb-1">{r.name}</p>
                          <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">slug: {r.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-zinc-400 font-black text-xs">
                      {r.created_at?.toDate() ? 
                        new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(r.created_at.toDate()) 
                        : "--"}
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-white/5 px-2 py-1 rounded-md">{r.plan_type || "free"}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <button 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(r.id!, r.is_active); }}
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                            r.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}
                       >
                         {r.is_active ? "Ativo" : "Suspenso"}
                       </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAccess(r.id!); }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-theme text-white px-4 py-2 text-[10px] font-black shadow-lg shadow-primary-theme/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        Acessar
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-zinc-950/40 relative">
                      <td colSpan={6} className="px-8 py-10">
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                          <RestaurantLiveMetrics restaurantId={r.id!} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && !loading && (
          <div className="py-20 text-center text-zinc-600 space-y-4">
             <div className="bg-white/5 h-20 w-20 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Search className="h-8 w-8 opacity-20" />
             </div>
             <p className="font-bold">Nenhum restaurante encontrado com esses termos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
