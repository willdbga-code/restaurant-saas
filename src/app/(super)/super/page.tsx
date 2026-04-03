"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Restaurant } from "@/lib/firebase/firestore";
import { Globe, ShieldCheck, Zap, TrendingUp, AlertTriangle, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { repairOrphanedData } from "@/lib/firebase/repair_data";
import { toast } from "sonner";

export default function SuperDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "restaurants"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snap) => {
      setRestaurants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant)));
      setLoading(false);
    });
  }, []);

  const handleRepair = async () => {
    if (!confirm("Tem certeza que deseja executar o reparo Fort Knox? Isso carimbará documentos órfãos com um ID padrão.")) return;
    setRepairing(true);
    try {
      const fixed = await repairOrphanedData();
      toast.success(`Reparo concluído! ${fixed} documentos foram corrigidos.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao executar reparo.");
    } finally {
      setRepairing(false);
    }
  };

  const total = restaurants.length;
  const active = restaurants.filter(r => r.is_active).length;
  const inactive = total - active;

  const stats = [
    { label: "Total de Clientes", value: total, icon: Globe, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Assinaturas Ativas", value: active, icon: ShieldCheck, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Contas Inativas", value: inactive, icon: Zap, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tight text-white leading-tight">Painel de <br/><span className="text-primary-theme">Crescimento</span></h1>
        <p className="text-zinc-500 font-bold text-lg max-w-xl">Bem-vindo, gestor. Aqui está o resumo do desempenho da sua plataforma hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, idx) => (
          <div key={idx} className="glass-morphism-heavy p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className={cn("absolute -top-6 -right-6 h-32 w-32 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-150", s.color.replace('text', 'bg'))} />
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6", s.bg)}>
               <s.icon className={cn("h-7 w-7", s.color)} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{s.label}</p>
            <p className="text-6xl font-black text-white tracking-tighter">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="pt-12 border-t border-white/5">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
               <div className="flex items-center gap-3 mb-8">
                  <TrendingUp className="h-6 w-6 text-primary-theme" />
                  <h2 className="text-2xl font-black text-white tracking-tight">Atividade Recente</h2>
               </div>
               <div className="glass-morphism rounded-[2.5rem] p-10 border border-white/5 border-dashed">
                  <p className="text-zinc-600 font-bold text-center italic">Monitoramento de eventos em tempo real em desenvolvimento...</p>
               </div>
            </div>

            <div>
               <div className="flex items-center gap-3 mb-8">
                  <Hammer className="h-6 w-6 text-orange-500" />
                  <h2 className="text-2xl font-black text-white tracking-tight">Manutenção Crítica</h2>
               </div>
               <div className="glass-morphism-heavy p-10 rounded-[2.5rem] border border-orange-500/10">
                  <div className="flex items-start gap-4 mb-8">
                     <div className="h-10 w-10 shrink-0 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                     </div>
                     <div>
                        <p className="text-white font-black text-lg">Reparo Fort Knox</p>
                        <p className="text-zinc-500 text-sm font-bold">Unifica documentos órfãos (sem `restaurant_id`) sob o tenant de recuperação. Use após migrações ou perda de eixo.</p>
                     </div>
                  </div>
                  <button 
                     onClick={handleRepair}
                     disabled={repairing}
                     className="w-full h-16 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-black transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                     {repairing ? <Zap className="h-5 w-5 animate-spin" /> : <Hammer className="h-5 w-5" />}
                     Executar Reparo Massivo
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
