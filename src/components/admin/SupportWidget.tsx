"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Info, AlertTriangle, ChevronRight, User, Headset, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  serverTimestamp, 
  Timestamp,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { createTicket, sendSupportMessage, SupportTicket, ChatMessage } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"menu" | "new_ticket" | "chat">("menu");
  const [activeTickets, setActiveTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rate Limit check
  const [recentTicketsCount, setRecentTicketsCount] = useState(0);

  useEffect(() => {
    if (!user?.restaurant_id || !isOpen) return;

    // Listen for tickets for this restaurant
    const q = query(
      collection(db, "support_tickets"),
      where("restaurant_id", "==", user.restaurant_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Mapeia e ordena no cliente para evitar erro de índice
      const allTickets = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a: any, b: any) => {
          const dateA = a.created_at?.seconds || 0;
          const dateB = b.created_at?.seconds || 0;
          return dateB - dateA; // Descending
        }) as SupportTicket[];
      
      // Filtra status no cliente (evita erro de índice)
      const tickets = allTickets.filter(t => ["open", "in_progress"].includes(t.status));
      setActiveTickets(tickets);

      // Check rate limit (last hour) no cliente também
      const oneHourAgo = Date.now() - 3600000;
      const recentOnes = allTickets.filter(t => {
        const createdAt = (t.created_at as any)?.toDate?.()?.getTime() || 0;
        return createdAt >= oneHourAgo;
      });
      setRecentTicketsCount(recentOnes.length);
    });

    return () => unsubscribe();
  }, [user?.restaurant_id, isOpen]);

  // Chat listener
  useEffect(() => {
    if (view !== "chat" || !selectedTicket?.id) return;

    const q = query(
      collection(db, "support_messages"),
      where("ticket_id", "==", selectedTicket.id)
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
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [view, selectedTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !user?.restaurant_id) return;
    if (recentTicketsCount >= 3) return;

    setLoading(true);
    try {
      const docRef = await createTicket({
        restaurant_id: user.restaurant_id,
        restaurant_name: "Restaurante", // Placeholder (pode-se buscar do DB se necessário)
        user_id: user.uid,
        user_name: user.name,
        subject: subject,
        priority: "medium",
      });

      // Send the initial description as the first message
      await sendSupportMessage({
        ticket_id: docRef.id,
        restaurant_id: user.restaurant_id,
        sender_uid: user.uid,
        sender_name: user.name,
        text: description,
        is_support: false
      });

      setSubject("");
      setDescription("");
      setView("menu");
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedTicket?.id || !user?.restaurant_id) return;

    const text = input;
    setInput("");

    try {
      await sendSupportMessage({
        ticket_id: selectedTicket.id,
        restaurant_id: user.restaurant_id,
        sender_uid: user.uid,
        sender_name: user.name,
        text: text,
        is_support: false
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-4 font-sans">
      
      {/* Floating Panel */}
      {isOpen && (
        <div className={cn(
          "w-[380px] bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300",
          view === "chat" ? "h-[550px]" : "h-auto max-h-[500px]"
        )}>
          
          {/* Header */}
          <div className="p-6 bg-primary-theme flex items-center justify-between text-black">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black/10 rounded-full flex items-center justify-center">
                <Headset size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight leading-none">Suporte SaaS</h3>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Atendimento Técnico</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="h-8 w-8 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40">
            
            {view === "menu" && (
              <div className="p-6 space-y-6">
                
                {/* Active Tickets Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Chamados Ativos</h4>
                  {activeTickets.length === 0 ? (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center italic text-zinc-600 text-xs">
                      Nenhum chamado pendente no momento.
                    </div>
                  ) : (
                    activeTickets.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => {
                          setSelectedTicket(t);
                          setView("chat");
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-3 w-3 rounded-full",
                            t.is_chat_active ? "bg-green-500 animate-pulse" : "bg-orange-500"
                          )} />
                          <div>
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[180px]">{t.subject}</p>
                            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">#{t.ticket_id} • {t.is_chat_active ? "Sendo atendido" : "Aguardando..."}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700 group-hover:text-primary-theme transition-colors" />
                      </button>
                    ))
                  )}
                </div>

                {/* Create New Section */}
                <div className="pt-6 border-t border-white/5">
                  {recentTicketsCount >= 3 ? (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3">
                      <AlertTriangle className="text-orange-500 shrink-0" size={16} />
                      <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                        Você atingiu o limite de <span className="text-white font-bold">3 tickets por hora</span>. 
                        Aguarde um momento antes de abrir um novo chamado.
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setView("new_ticket")}
                      className="w-full h-14 bg-primary-theme text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary-theme/10"
                    >
                      <MessageCircle size={18} />
                      Abrir Novo Chamado
                    </button>
                  )}
                </div>
              </div>
            )}

            {view === "new_ticket" && (
              <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                <button 
                  type="button"
                  onClick={() => setView("menu")}
                  className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  <ChevronRight size={12} className="rotate-180" />
                  Voltar
                </button>
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">O que está acontecendo?</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5 px-1">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Assunto Curto</label>
                      <input 
                        required
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex: Impressora KDS não funciona"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary-theme/30 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 px-1">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Detalhes do problema</label>
                      <textarea 
                        required
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Descreva o que houve da forma mais detalhada possível..."
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary-theme/30 transition-all resize-none"
                      />
                    </div>
                    <button 
                      disabled={loading}
                      className="w-full h-14 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-theme transition-all disabled:opacity-30"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "ENVIAR CHAMADO"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {view === "chat" && selectedTicket && (
              <div className="flex flex-col h-full bg-black/20 overflow-hidden">
                {/* Chat Tickets Header */}
                <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <button 
                    onClick={() => setView("menu")}
                    className="h-8 w-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-zinc-500 transition-colors"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[180px] leading-none mb-1">{selectedTicket.subject}</p>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Ticket #{selectedTicket.ticket_id}</p>
                  </div>
                  <div className="w-8 h-8" />
                </div>

                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                >
                  {!selectedTicket.is_chat_active && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                       <Info className="text-orange-500 shrink-0" size={16} />
                       <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                         Um Super Admin foi notificado. <br/>
                         <span className="text-white font-bold uppercase tracking-tight">O chat abrirá assim que ele responder.</span>
                       </p>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.is_support ? "items-start" : "ml-auto items-end"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-[11px] font-medium leading-relaxed",
                        msg.is_support 
                          ? "bg-zinc-800 text-zinc-300 rounded-tl-none border border-white/5" 
                          : "bg-primary-theme text-black font-bold rounded-tr-none"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-zinc-700 font-bold uppercase mt-1 px-1">
                        {msg.created_at ? formatDistanceToNow((msg.created_at as any).toDate(), { addSuffix: true, locale: ptBR }) : 'Agora'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Input Area (Only if active) */}
                <div className="p-6 bg-zinc-950/80 border-t border-white/5">
                  <div className="relative group">
                    <input 
                      disabled={!selectedTicket.is_chat_active}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder={selectedTicket.is_chat_active ? "Digite sua mensagem..." : "Aguardando suporte..."}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary-theme/30 transition-all disabled:opacity-30"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!selectedTicket.is_chat_active || !input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary-theme text-black rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-theme/20 disabled:hidden"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center text-black shadow-2xl transition-all hover:scale-110 active:scale-90 group relative",
          isOpen ? "bg-white rotate-90" : "bg-primary-theme"
        )}
      >
        {isOpen ? <X size={28} /> : <Headset size={28} />}
        {!isOpen && activeTickets.some(t => t.is_chat_active) && (
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-4 border-zinc-950 animate-pulse shadow-lg" />
        )}
      </button>

    </div>
  );
}
