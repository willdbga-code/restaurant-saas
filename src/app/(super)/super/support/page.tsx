"use client";

import { Headset, MessageCircle, Bell, Search, Send, User, ChevronRight, Activity, Zap, CheckCircle2, Loader2, ShieldAlert, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { ChatMessage, sendSupportMessage, SupportTicket } from "@/lib/firebase/firestore";

const notifications = [
  { id: 1, title: "Novo Restaurante", description: "Restaurante 'Sabor Real' acaba de se cadastrar.", time: "2 min ago", type: "success" },
  { id: 2, title: "Falha de Pagamento", description: "O cartão do restaurante 'Burger Boss' foi recusado.", time: "15 min ago", type: "error" },
  { id: 3, title: "Ticket Resolvido", description: "Dúvida de 'Pizza My Pizza' sobre KDS foi finalizada.", time: "1h ago", type: "info" },
];

export default function SupportHubPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listener para Tickets Ativos (Sidebar)
  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((t: any) => ["open", "in_progress"].includes(t.status)) as SupportTicket[];
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listener para Mensagens do Ticket Selecionado
  useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const q = query(
      collection(db, "support_messages"),
      where("ticket_id", "==", selectedTicket.id),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a: any, b: any) => {
          const dateA = a.created_at?.seconds || 0;
          const dateB = b.created_at?.seconds || 0;
          return dateA - dateB; // Ascending
        }) as ChatMessage[];
      setMessages(msgs);
      setLoadingMessages(false);
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  const handleSend = async () => {
    if (!input.trim() || !user || !selectedTicket) return;
    
    const messageText = input;
    setInput("");

    try {
      await sendSupportMessage({
        ticket_id: selectedTicket.id!,
        restaurant_id: selectedTicket.restaurant_id,
        sender_uid: user.uid,
        sender_name: user.name,
        text: messageText,
        is_support: true
      });

      // Se o chat ainda não estava ativo, ativar
      if (!selectedTicket.is_chat_active) {
        // Import updateDoc if needed, or use a helper
        const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
        await updateDoc(firestoreDoc(db, "support_tickets", selectedTicket.id!), {
          is_chat_active: true,
          status: "in_progress",
          last_message_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col glass-morphism-heavy rounded-[2.5rem] border border-white/5 overflow-hidden font-mono translate-y-4 shadow-2xl">
      <div className="flex-1 flex overflow-hidden">
        
        {/* List of Conversations (Tickets) */}
        <div className="w-96 flex flex-col border-r border-white/5 bg-black/40 backdrop-blur-md">
           <div className="p-8 border-b border-white/5">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <MessageCircle size={14} className="text-primary-theme" />
                    Conversas Ativas
                 </h2>
                 <span className="px-2 py-0.5 bg-primary-theme/20 text-primary-theme text-[9px] font-black rounded-full border border-primary-theme/30">
                   {tickets.length}
                 </span>
              </div>
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary-theme transition-colors" size={14} />
                 <input 
                   type="text" 
                   placeholder="FILTRAR TICKETS..."
                   className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-[10px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary-theme/30 transition-all uppercase tracking-widest font-black"
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-12 flex flex-col items-center gap-4 opacity-30">
                   <Loader2 className="animate-spin h-6 w-6 text-primary-theme" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 flex flex-col items-center gap-6 opacity-20 text-center">
                   <Ghost size={32} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Aguardando novos tickets de restaurantes...</span>
                </div>
              ) : (
                tickets.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={cn(
                      "w-full p-6 text-left flex gap-4 transition-all hover:bg-white/5 border-b border-white/5 group relative overflow-hidden",
                      selectedTicket?.id === t.id ? "bg-white/5" : ""
                    )}
                  >
                     {selectedTicket?.id === t.id && (
                       <div className="absolute left-0 top-0 h-full w-1 bg-primary-theme shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                     )}
                     <div className="h-12 w-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden relative">
                        <User size={20} className={cn(selectedTicket?.id === t.id ? "text-primary-theme" : "text-zinc-700")} />
                        {!t.is_chat_active && (
                          <div className="absolute top-1 right-1 h-2 w-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_5px_#f97316]" />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                           <span className="text-[11px] font-black text-white truncate uppercase tracking-tighter">
                             {t.restaurant_name}
                           </span>
                           <span className="text-[9px] text-zinc-600 font-bold italic shrink-0">
                             {t.created_at ? (t.created_at as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                           </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold truncate mb-2 uppercase tracking-tighter">
                           #{t.ticket_id} • {t.subject}
                        </p>
                        <div className="flex items-center gap-2">
                           <span className={cn(
                             "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em]",
                             t.status === "open" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                           )}>
                             {t.status === "open" ? "Novo Ticket" : "Em Suporte"}
                           </span>
                        </div>
                     </div>
                  </button>
                ))
              )}
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-black/60 relative">
           {selectedTicket ? (
             <>
               {/* Chat Header */}
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-xl sticky top-0 z-10">
                  <div className="flex items-center gap-6">
                     <div className="relative">
                        <div className="h-16 w-16 rounded-[2rem] bg-zinc-950 border border-white/5 flex items-center justify-center text-primary-theme shadow-2xl">
                           <User size={32} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-4 border-zinc-950 rounded-full shadow-lg" />
                     </div>
                     <div>
                        <div className="flex items-center gap-4 mb-2">
                           <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                             {selectedTicket.restaurant_name}
                           </h2>
                           <div className="px-3 py-1 bg-white/5 rounded-lg flex items-center gap-2 border border-white/10">
                              <Zap size={10} className="text-primary-theme fill-primary-theme" />
                              <span className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase leading-none">PREMIUM PRO</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                             TICKET: <span className="text-white">#{selectedTicket.ticket_id}</span>
                           </p>
                           <div className="h-1 w-1 bg-zinc-800 rounded-full" />
                           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                             SITUACAO: <span className="text-primary-theme animate-pulse italic">{selectedTicket.status}</span>
                           </p>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <button className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all border border-white/5 group">
                        <Activity size={18} className="group-hover:rotate-12 transition-transform" />
                     </button>
                     <button className="h-12 px-6 bg-white/5 text-green-500 border border-green-500/20 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-500/10 transition-all">
                        <CheckCircle2 size={16} />
                        Resolver Ticket
                     </button>
                  </div>
               </div>

               {/* Messages Stream */}
               <div 
                 ref={scrollRef}
                 className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar-hidden bg-black/40"
               >
                  {!selectedTicket.is_chat_active && messages.length === 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 mb-8 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                       <ShieldAlert className="text-orange-500 shrink-0" size={24} />
                       <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Aguardando sua abertura</h4>
                          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                            Este restaurante abriu um ticket sobre <span className="text-white font-bold">"{selectedTicket.subject}"</span>. 
                            Responda abaixo para desbloquear o chat para eles.
                          </p>
                       </div>
                    </div>
                  )}

                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                       <Loader2 className="animate-spin text-primary-theme" />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={cn(
                        "flex flex-col max-w-[75%]",
                        msg.is_support ? "ml-auto items-end" : "items-start"
                      )}>
                         <div className="flex items-center gap-3 mb-2 px-2">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                              {msg.is_support ? "Super Admin" : "Restaurante"}
                            </span>
                            <span className="text-[9px] text-zinc-800 font-bold italic">
                              {msg.created_at ? (msg.created_at as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </span>
                         </div>
                         <div className={cn(
                           "px-8 py-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-2xl",
                           msg.is_support 
                             ? "bg-primary-theme text-black rounded-tr-none font-bold" 
                             : "bg-zinc-900 text-zinc-300 rounded-tl-none border border-white/5"
                         )}>
                            {msg.text}
                         </div>
                      </div>
                    ))
                  )}
               </div>

               {/* Message Input */}
               <div className="p-8 bg-black/80 backdrop-blur-3xl border-t border-white/5">
                  <div className="relative group max-w-5xl mx-auto">
                     <input 
                       type="text" 
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                       placeholder="DIGITE SUA RESPOSTA TECNICA..."
                       className="w-full bg-white/5 border border-white/10 rounded-full py-6 pl-10 pr-28 text-[11px] text-white placeholder:text-zinc-800 focus:outline-none focus:ring-4 focus:ring-primary-theme/5 focus:border-primary-theme/30 transition-all font-black uppercase tracking-widest"
                     />
                     <button 
                       onClick={handleSend}
                       disabled={!input.trim()}
                       className="absolute right-4 top-1/2 -translate-y-1/2 h-14 px-8 bg-primary-theme text-black rounded-full flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                     >
                        <span>ENVIAR</span>
                        <Send size={16} />
                     </button>
                  </div>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center space-y-8 animate-in fade-in duration-1000">
                <div className="h-40 w-40 bg-white/5 rounded-[4rem] border border-white/5 flex items-center justify-center text-zinc-700 relative">
                   <div className="absolute inset-0 bg-primary-theme/5 blur-3xl rounded-full" />
                   <Headset size={64} className="relative z-10" />
                </div>
                <div className="max-w-xs space-y-3">
                   <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Command Support Center</h3>
                   <p className="text-[10px] font-black leading-relaxed uppercase tracking-[0.2em] text-primary-theme/50">
                     Aguardando selecao de canal... <br/> Selecione um restaurante na lateral.
                   </p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
