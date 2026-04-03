"use client";

import { History, CheckCircle2, Search, ArrowRight, User, Calendar, MessageSquare, Loader2, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SupportTicket } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TicketsHistoryPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("created_at", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportTicket[];
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tight text-white leading-tight uppercase italic">Histórico de <br/><span className="text-primary-theme">Tickets</span></h1>
        <p className="text-zinc-500 font-bold text-lg max-w-xl">Central de inteligência e suporte. Consulte resoluções passadas.</p>
      </header>

      {/* Ticket Table */}
      <div className="glass-morphism-heavy rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-primary-theme/10 flex items-center justify-center text-primary-theme">
               <History size={20} />
             </div>
             <div>
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Resoluções Recentes</h3>
               <p className="text-[10px] text-zinc-500 font-bold mt-1">Auditado em tempo real</p>
             </div>
           </div>
           
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-primary-theme transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="PROCURAR TICKET..."
                className="bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-primary-theme/30 transition-all w-64"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full">
              <thead>
                 <tr className="text-left bg-white/[0.02]">
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ticket ID</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Restaurante</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Problema</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Agente</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {loading ? (
                    <tr>
                       <td colSpan={5} className="py-20">
                          <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                             <Loader2 className="animate-spin text-primary-theme" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Banco de Dados...</span>
                          </div>
                       </td>
                    </tr>
                 ) : tickets.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="py-20">
                          <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                             <Ghost size={40} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Nenhum ticket registrado</span>
                          </div>
                       </td>
                    </tr>
                 ) : (
                    tickets.map((t) => (
                      <tr key={t.id} className="group hover:bg-white/5 transition-colors cursor-pointer">
                        <td className="px-8 py-6">
                            <span className="text-xs font-black text-primary-theme">#{t.ticket_id}</span>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-zinc-700 group-hover:bg-primary-theme transition-colors" />
                              <span className="text-sm font-bold text-white">{t.restaurant_name}</span>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-zinc-300">{t.subject}</span>
                              <span className="text-[10px] text-zinc-600 mt-1 uppercase italic">
                                {t.created_at ? format(t.created_at.toDate(), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Agora'}
                              </span>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <User size={12} />
                              <span className="text-[10px] font-black uppercase tracking-tighter">AI AGENT</span>
                            </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
                            t.status === 'resolved' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                          )}>
                             <span className={cn("h-1 w-1 rounded-full", t.status === 'resolved' ? "bg-green-500" : "bg-orange-500 animate-pulse")} />
                             <span className="text-[10px] font-black uppercase tracking-widest">
                               {t.status === 'resolved' ? 'RESOLVIDO' : 'ABERTO'}
                             </span>
                          </div>
                        </td>
                      </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>

        <div className="p-8 bg-white/[0.02] flex items-center justify-center border-t border-white/5">
           <button className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white transition-colors tracking-widest uppercase">
              Ver histórico completo <ArrowRight size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}
