"use client";

import { Terminal as TerminalIcon, ShieldAlert, Cpu, Ghost, Search, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SystemLog, archiveLogs } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TerminalPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "system_logs"),
      orderBy("created_at", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((log: any) => !log.archived) as SystemLog[];
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClearLogs = async () => {
    try {
      setIsCleaning(true);
      await archiveLogs();
    } catch (error) {
      console.error("Erro ao arquivar logs:", error);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-mono">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tight text-white leading-tight uppercase italic">Terminal de <br/><span className="text-primary-theme">Incidentes</span></h1>
        <p className="text-zinc-500 font-bold text-lg max-w-xl">Monitoramento bruto de erros e logs do sistema em tempo real.</p>
      </header>

      {/* Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Terminal Screen */}
        <div className="lg:col-span-2 rounded-[2.5rem] bg-black border border-white/5 p-6 shadow-2xl relative group overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-theme/30 animate-pulse" />
           <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
             <div className="flex items-center gap-2">
               <div className="h-3 w-3 rounded-full bg-red-500" />
               <div className="h-3 w-3 rounded-full bg-yellow-500" />
               <div className="h-3 w-3 rounded-full bg-green-500" />
               <span className="ml-4 text-[10px] text-zinc-500 uppercase tracking-widest font-black">SysLog — root@saas</span>
             </div>
             <div className="flex items-center gap-x-2">
               <div className="px-3 py-1 bg-white/5 rounded-lg text-[10px] text-zinc-500">LINE: 242</div>
               <div className="px-3 py-1 bg-primary-theme/10 rounded-lg text-[10px] text-primary-theme">LIVE</div>
             </div>
           </div>

           <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
             {loading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-theme opacity-50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Sincronizando logs...</span>
               </div>
             ) : logs.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                  <Ghost className="h-12 w-12" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nenhum incidente ativo</span>
               </div>
             ) : (
               logs.map((log) => (
                <div key={log.id} className="flex gap-4 group/item hover:bg-white/5 p-3 rounded-2xl transition-all border border-transparent hover:border-white/5">
                   <div className={cn(
                     "mt-1 rotate-45",
                     log.type === 'error' || log.type === 'incident' ? "text-red-500" : log.type === 'warning' ? "text-yellow-500" : "text-blue-500"
                   )}>
                     <ShieldAlert size={14} />
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center justify-between gap-4 mb-1">
                       <span className="text-[10px] font-black uppercase text-zinc-500">[{log.restaurant_id}]</span>
                       <span className="text-[10px] text-zinc-600 italic">
                         {log.created_at ? formatDistanceToNow(log.created_at.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora'}
                       </span>
                     </div>
                     <p className="text-sm text-zinc-300 font-medium tracking-tight leading-relaxed">
                       <span className="text-primary-theme font-black mr-2">&gt;</span>
                       {log.message}
                     </p>
                   </div>
                </div>
               ))
             )}
             <div className="flex items-center gap-2 text-zinc-600 animate-pulse mt-6">
                <span className="text-primary-theme">_</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Aguardando novos eventos...</span>
             </div>
           </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
           <div className="glass-morphism-heavy p-8 rounded-[2.5rem] border border-white/5">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Cpu size={16} className="text-primary-theme" />
                Saúde do Core
              </h3>
              
              <div className="space-y-4">
                 {[
                   { label: "Functions", status: "Estável", color: "text-green-500"},
                   { label: "Firestore", status: "99.9% Uptime", color: "text-green-500"},
                   { label: "Auth", status: "Ok", color: "text-blue-500"},
                   { label: "Stripe/Pay", status: "Ok", color: "text-blue-500"}
                 ].map((s) => (
                   <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-500">{s.label}</span>
                      <span className={cn("text-[10px] font-black uppercase italic", s.color)}>{s.status}</span>
                   </div>
                 ))}
              </div>
           </div>

           <button 
              onClick={handleClearLogs}
              disabled={isCleaning || logs.length === 0}
              className="w-full glass-morphism-heavy p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-center gap-3 text-red-500 hover:bg-red-500/10 transition-all group overflow-hidden relative disabled:opacity-30 disabled:hover:bg-transparent"
           >
              {isCleaning ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{isCleaning ? "Arquivando..." : "Limpar Logs do Dia"}</span>
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-red-500 transition-all group-hover:w-full" />
           </button>
        </div>

      </div>
    </div>
  );
}
