"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Table, Product } from "@/lib/firebase/firestore";
import { Order, OrderItem } from "@/lib/firebase/orders";
import { Users, Utensils, DollarSign, Clock, AlertTriangle, CheckCircle2, TrendingUp, Info, CreditCard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePlanPricing, PlanTier, PLAN_CONFIGS, getGemAdvisorNote } from "@/lib/utils/pricing";
import { updateDoc, doc } from "firebase/firestore";

interface LiveStats {
  totalTables: number;
  occupiedTables: number;
  activeOrdersCount: number;
  openRevenue: number;
  kdsPendingItems: number;
  staffCount: number;
  hasBottleneck: boolean;
  isIdleDuringRush: boolean;
  monthlyOrders: number;
}

export function RestaurantLiveMetrics({ restaurantId }: { restaurantId: string }) {
  const [stats, setStats] = useState<LiveStats>({
    totalTables: 0,
    occupiedTables: 0,
    activeOrdersCount: 0,
    openRevenue: 0,
    kdsPendingItems: 0,
    staffCount: 0,
    hasBottleneck: false,
    isIdleDuringRush: false,
    monthlyOrders: 0,
  });

  const [activeRestaurant, setActiveRestaurant] = useState<any>(null);

  useEffect(() => {
    // 0. Monitorar o próprio documento do Restaurante (para Planos)
    const unsubRest = onSnapshot(doc(db, "restaurants", restaurantId), (snap) => {
      setActiveRestaurant(snap.data());
    }, (err) => console.warn("LiveMetrics: Rest error:", err));

    // 1. Monitorar Mesas
    const qTables = query(collection(db, "tables"), where("restaurant_id", "==", restaurantId));
    const unsubTables = onSnapshot(qTables, (snap) => {
      const all = snap.docs.map(d => d.data() as Table);
      const occupied = all.filter(t => t.status === "occupied").length;
      setStats(prev => ({ ...prev, totalTables: all.length, occupiedTables: occupied }));
    }, (err) => console.warn("LiveMetrics: Tables error:", err));

    // 2. Monitorar Pedidos Ativos e Financeiro
    const qOrders = query(
      collection(db, "orders"), 
      where("restaurant_id", "==", restaurantId),
      where("payment_status", "in", ["unpaid", "partial"])
    );
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const all = snap.docs.map(d => d.data() as Order);
      const revenue = all.reduce((acc, curr) => acc + (curr.total || 0), 0);
      setStats(prev => ({ ...prev, activeOrdersCount: all.length, openRevenue: revenue }));
    }, (err) => console.warn("LiveMetrics: Orders error:", err));

    // 2.1 Monitorar Pedidos Mensais (Total desde dia 1)
    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    const qMonthly = query(
      collection(db, "orders"),
      where("restaurant_id", "==", restaurantId),
      where("created_at", ">=", Timestamp.fromDate(firstDay))
    );
    const unsubMonthly = onSnapshot(qMonthly, (snap) => {
      setStats(prev => ({ ...prev, monthlyOrders: snap.size }));
    }, (err) => console.warn("LiveMetrics: Monthly error:", err));

    // 3. Monitorar KDS (Carga da Cozinha)
    const qItems = query(
      collection(db, "order_items"), 
      where("restaurant_id", "==", restaurantId),
      where("status", "in", ["pending", "preparing"])
    );
    const unsubItems = onSnapshot(qItems, (snap) => {
      const all = snap.docs.map(d => d.data() as OrderItem);
      const now = Date.now();
      const twentyMins = 20 * 60 * 1000;
      const bottleneck = all.some(item => {
        const createdAt = item.created_at?.toMillis() || now;
        return (now - createdAt) > twentyMins;
      });
      setStats(prev => ({ ...prev, kdsPendingItems: all.length, hasBottleneck: bottleneck }));
    }, (err) => console.warn("LiveMetrics: KDS error:", err));

    // 4. Monitorar Staff
    const qStaff = query(collection(db, "users"), where("restaurant_id", "==", restaurantId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStats(prev => ({ ...prev, staffCount: snap.size }));
    }, (err) => console.warn("LiveMetrics: Staff error:", err));

    return () => {
      unsubRest();
      unsubTables();
      unsubOrders();
      unsubMonthly();
      unsubItems();
      unsubStaff();
    };
  }, [restaurantId]);

  const updatePlan = async (tier: PlanTier) => {
    await updateDoc(doc(db, "restaurants", restaurantId), { 
      plan_type: tier,
      updated_at: Timestamp.now() 
    });
  };

  const currentPlan = (activeRestaurant?.plan_type || "free") as PlanTier;
  const pricing = calculatePlanPricing(currentPlan);

  const cards = [
    { 
      label: "Ocupação Atual", 
      value: `${stats.occupiedTables} / ${stats.totalTables}`, 
      icon: Users, 
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      desc: "Status do salão"
    },
    { 
      label: "Faturamento Aberto", 
      value: (stats.openRevenue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
      icon: DollarSign, 
      color: "text-green-400",
      bg: "bg-green-500/10",
      desc: "Total em faturamento não liquidado"
    },
    { 
      label: "Pedidos Mensais", 
      value: `${stats.monthlyOrders}`, 
      icon: TrendingUp, 
      color: "text-zinc-400",
      bg: "bg-white/5",
      desc: `Limite: ${PLAN_CONFIGS[currentPlan].maxTables * 150} /mês`
    },
    { 
      label: "Cozinha (Draft)", 
      value: `${stats.kdsPendingItems} itens`, 
      icon: Utensils, 
      color: stats.hasBottleneck ? "text-red-400" : "text-orange-400",
      bg: stats.hasBottleneck ? "bg-red-500/10" : "bg-orange-500/10",
      desc: "Pendentes no KDS"
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
         <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
               <TrendingUp className="h-4 w-4" />
               Estatísticas ao Vivo
            </h3>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Plano:</span>
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
              {(["essential", "pro", "enterprise"] as PlanTier[]).map(tier => (
                <button
                  key={tier}
                  onClick={() => updatePlan(tier)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all active:scale-95",
                    currentPlan === tier ? "bg-primary-theme text-white shadow-lg shadow-primary-theme/20" : "text-zinc-500 hover:text-white"
                  )}
                >
                  {tier}
                </button>
              ))}
            </div>
         </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 p-5 rounded-[1.5rem] hover:bg-white/[0.04] transition-all">
            <div className={cn("inline-flex p-2.5 rounded-xl mb-4", c.bg)}>
              <c.icon className={cn("h-5 w-5", c.color)} />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{c.label}</p>
            <p className="text-2xl font-black text-white tracking-tight">{c.value}</p>
            <p className="text-zinc-600 text-[10px] font-bold mt-2 italic capitalize">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Seção Financeira & Margens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
        <div className="space-y-6">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Engenharia Financeira & SAC</h4>
           
           <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="h-20 w-20 text-green-500" />
              </div>
              
              <div className="space-y-5 relative z-10">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-zinc-500 text-xs font-bold mb-1">Valor Mensal (Fixado)</p>
                      <p className="text-4xl font-black text-white tracking-tighter">{(pricing.actualPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                   </div>
                   <div className="text-right">
                    <p className="text-zinc-500 text-[10px] font-black tracking-widest uppercase">Lucro Líquido Real</p>
                    <p className={cn(
                      "text-xl font-black tracking-tighter",
                      pricing.netProfit >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {pricing.netProfit >= 0 ? "+" : ""}{(pricing.netProfit / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                   </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                   <div className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-500">Custo Infraestrutura Estimado (DB {pricing.cloudGB}GB)</span>
                      <span className="text-zinc-300">{(pricing.cloudCost / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-500">Custo SAC / Suporte (Positivo {pricing.supportHours}h/mês)</span>
                      <span className="text-zinc-300">{(pricing.supportCost / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                   </div>
                </div>
                
                <div className="pt-4 flex items-center justify-between">
                   <div className="bg-primary-theme/10 border border-primary-theme/20 px-4 py-2 rounded-xl">
                      <p className="text-[9px] font-black text-primary-theme uppercase tracking-widest">Taxa de Adesão (Treinamento)</p>
                      <p className="text-lg font-black text-white">{(pricing.setupFee / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                   </div>
                   <button className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors border-b border-zinc-700">Ver Faturas</button>
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Diagnóstico de Saúde Operacional</h4>
           <div className="space-y-3">
             {/* Alerta de Staff */}
             {stats.staffCount === 0 && stats.occupiedTables > 0 ? (
               <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-5 rounded-3xl animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                     <p className="text-[11px] font-black text-red-500 uppercase tracking-tight leading-none mb-1">Risco Crítico: Operação Sem Pessoal</p>
                     <p className="text-[10px] text-red-500/70 font-bold">Mesas ocupadas sem staff logado.</p>
                  </div>
               </div>
             ) : (
               <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Gestão de equipe estável</p>
               </div>
             )}

             {/* Alerta de Cozinha */}
             {stats.hasBottleneck ? (
               <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 p-5 rounded-3xl">
                  <Clock className="h-5 w-5 text-orange-500 shrink-0" />
                  <div>
                     <p className="text-[11px] font-black text-orange-500 uppercase tracking-tight leading-none mb-1">Carga Crítica de KDS</p>
                     <p className="text-[10px] text-orange-500/70 font-bold">Itens pendentes há mais de 20 minutos.</p>
                  </div>
               </div>
             ) : (
                <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                   <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                   <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Fila do KDS controlada</p>
                </div>
             )}

             {/* Alerta de Ociosidade */}
             {stats.isIdleDuringRush && (
               <div className="flex items-center gap-4 bg-zinc-800/40 border border-white/5 p-5 rounded-3xl">
                  <Info className="h-5 w-5 text-zinc-400 shrink-0" />
                  <div>
                     <p className="text-[11px] font-black text-zinc-300 uppercase tracking-tight leading-none mb-1">Aparelho Ocioso (Rush Hour)</p>
                     <p className="text-[10px] text-zinc-500 font-bold italic">Horário de pico sem mesas abertas.</p>
                  </div>
               </div>
             )}
             
             <div className="bg-primary-theme/5 border border-primary-theme/10 p-5 rounded-3xl mt-4">
                <div className="flex items-center gap-3 text-primary-theme mb-2">
                   <Settings2 className="h-4 w-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Nota do Consultor Gem</p>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                   {getGemAdvisorNote(stats, pricing)}
                </p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
