"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Users, QrCode, Copy, CheckCircle2, Loader2, Landmark, ExternalLink, AlertCircle } from "lucide-react";
import { Order, PaymentMethod, processOrderPayment, notifyPaymentActivity } from "@/lib/firebase/orders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { createPixPaymentForOrder } from "@/app/actions/checkout";

import { Restaurant } from "@/lib/firebase/firestore";

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  restaurant?: Restaurant | null;
}

interface PixData {
  provider: string;
  qr_code_base64: string | null;
  qr_code_text: string | null;
  checkout_url?: string;
  payment_id: string;
  expires_at: string;
  amount_brl: number;
}

function fmt(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PaymentDrawer({ isOpen, onClose, order, restaurant }: PaymentDrawerProps) {
  const [step, setStep] = useState<"options" | "pix" | "success">("options");
  const [splitCount, setSplitCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cachedOrder, setCachedOrder] = useState<Order | null>(order);
  const [notifiedSplit, setNotifiedSplit] = useState(false);
  
  // PIX real data
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [gatewayAvailable, setGatewayAvailable] = useState<boolean | null>(null); // null = loading

  // Sync cache
  useEffect(() => {
    if (order) setCachedOrder(order);
  }, [order]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setStep("options");
      setSplitCount(1);
      setNotifiedSplit(false);
      setPixData(null);
      setPixError(null);
      setGatewayAvailable(null);
      
      // Notify payment flow started
      if (order) {
        notifyPaymentActivity({
          restaurantId: order.restaurant_id,
          orderId: order.id,
          tableLabel: order.table_label || "Mesa",
          type: "payment_started"
        });
      }
    }
  }, [isOpen]);

  // Notify when splitting begins
  useEffect(() => {
    if (isOpen && splitCount > 1 && !notifiedSplit && order) {
      notifyPaymentActivity({
        restaurantId: order.restaurant_id,
        orderId: order.id,
        tableLabel: order.table_label || "Mesa",
        type: "payment_started",
      });
      setNotifiedSplit(true);
    }
  }, [splitCount, isOpen, notifiedSplit, order]);

  // Auto-detect: listen for payment confirmation via webhook (real-time)
  useEffect(() => {
    if (step !== "pix" || !cachedOrder?.id) return;

    const unsub = onSnapshot(doc(db, "orders", cachedOrder.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Se o webhook confirmou o pagamento, mostra tela de sucesso!
      if (data.payment_status === "paid" || data.status === "closed") {
        setStep("success");
        toast.success("Pagamento confirmado automaticamente! ✅");
      }
    });

    return () => unsub();
  }, [step, cachedOrder?.id]);

  if (!cachedOrder) return null;

  const orderData = cachedOrder;
  const remaining = orderData.total - (orderData.amount_paid || 0);
  const myPart = Math.ceil(remaining / splitCount);

  async function handleGenerateRealPix() {
    if (!orderData || !restaurant?.id) return;
    setLoading(true);
    setPixError(null);

    try {
      const result = await createPixPaymentForOrder(
        restaurant.id,
        orderData.id,
        myPart,
        orderData.waiter_name || undefined,
      );

      if (!result) {
        // Sem gateway configurado — modo manual/simulação
        setGatewayAvailable(false);
        setStep("pix");
      } else if (result.checkout_url && !result.qr_code_base64) {
        // InfinitePay — redireciona para checkout externo
        window.open(result.checkout_url, "_blank");
        setPixData(result);
        setStep("pix");
        setGatewayAvailable(true);
      } else {
        // MercadoPago — QR code real
        setPixData(result);
        setStep("pix");
        setGatewayAvailable(true);
      }
    } catch (err: any) {
      console.error("Erro ao gerar PIX:", err);
      setPixError(err.message || "Erro ao gerar QR code PIX.");
      setGatewayAvailable(false);
      setStep("pix");
    } finally {
      setLoading(false);
    }
  }

  function copyPix() {
    const code = pixData?.qr_code_text || "";
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Código Pix copiado!");
    } else {
      toast.error("Código PIX não disponível.");
    }
  }

  // Fallback: confirma manualmente (quando não há gateway)
  async function handleManualConfirm() {
    setLoading(true);
    try {
      const amountToPay = splitCount > 1 ? myPart : remaining;
      await processOrderPayment(orderData.id, amountToPay, "pix");
      setStep("success");
      toast.success("Pagamento confirmado!");
    } catch (e) {
      toast.error("Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-[70] bg-black/70 backdrop-blur-md transition-opacity duration-500",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[70] flex flex-col max-h-[90vh] rounded-t-[3rem] glass-morphism-heavy border-t border-white/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-full flex justify-center py-5">
          <div className="w-14 h-1.5 rounded-full bg-white/10" />
        </div>

        {step === "options" && (
          <div className="px-8 pb-12 space-y-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Pagamento</h2>
                <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Saldo da Mesa: {fmt(remaining)}</p>
              </div>
              <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-zinc-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Split Control */}
            <div className="bg-white/[0.03] rounded-[2.5rem] p-8 border border-white/5 shadow-inner">
               <div className="flex items-center gap-4 mb-8">
                 <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                   <Users className="h-6 w-6" />
                 </div>
                 <h3 className="text-lg font-black text-white tracking-tight">Dividir a Conta?</h3>
               </div>
               
               <div className="flex items-center justify-between gap-6">
                  <button 
                    onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                    className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-3xl font-light active:scale-90 transition-transform"
                  >
                    -
                  </button>
                  <div className="text-center flex-1">
                    <span className="text-5xl font-black text-white tracking-tighter">{splitCount}</span>
                    <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mt-1">Pessoas</p>
                  </div>
                  <button 
                    onClick={() => setSplitCount(splitCount + 1)}
                    className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-3xl font-light active:scale-90 transition-transform"
                  >
                    +
                  </button>
               </div>

               <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">Valor por Pessoa</p>
                    <p className="text-4xl font-black text-white tracking-tighter">{fmt(myPart)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-zinc-700 uppercase tracking-widest mb-2">Total</p>
                    <p className="text-lg font-bold text-zinc-500 tracking-tight">{fmt(remaining)}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={handleGenerateRealPix}
                    disabled={loading}
                    className="btn-modern btn-orange-glow w-full py-5 rounded-3xl text-lg font-black flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="h-6 w-6" /> Pagar via Pix
                      </>
                    )}
                  </button>

                  <button 
                    disabled
                    className="btn-modern w-full h-16 bg-white/5 border border-white/10 text-zinc-500 rounded-3xl opacity-60 cursor-not-allowed group relative flex items-center justify-center gap-3"
                  >
                    <CreditCard className="h-6 w-6" /> 
                    Cartão de Crédito
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 text-[10px] text-zinc-500 px-3 py-1 rounded-full font-black tracking-tight">EM BREVE</span>
                  </button>
            </div>
            
            <p className="text-center text-[11px] text-zinc-600 font-black uppercase tracking-[0.2em] pt-4">
               RestaurantOS Secure Checkout
            </p>
          </div>
        )}

        {step === "pix" && (
          <div className="px-8 pb-12 flex flex-col items-center text-center overflow-y-auto">
             <div className="w-full flex justify-between items-center mb-10">
               <button onClick={() => { setStep("options"); setPixData(null); setPixError(null); }} className="text-zinc-600 font-black text-xs uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl">Voltar</button>
               <h2 className="text-lg font-black text-white">Pagamento Pix</h2>
               <div className="w-16" />
             </div>

             {/* QR Code Area */}
             {pixData?.qr_code_base64 ? (
               <>
                 {/* QR Code Real do MercadoPago */}
                 <div className="bg-white p-4 rounded-[2.5rem] mb-8 shadow-[0_30px_70px_rgba(255,255,255,0.1)] border border-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                      alt="QR Code PIX" 
                      className="h-56 w-56 rounded-[1.5rem]"
                    />
                 </div>

                 <div className="flex items-center gap-2 mb-6">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-[11px] font-black text-green-500 uppercase tracking-widest">
                     Aguardando pagamento...
                   </p>
                 </div>

                 <p className="text-zinc-500 text-xs font-medium mb-2 max-w-xs">
                   Escaneie o QR code no app do seu banco ou copie o código abaixo.
                   <br />O pagamento será confirmado automaticamente.
                 </p>
               </>
             ) : pixData?.checkout_url ? (
               <>
                 {/* InfinitePay — redireciona */}
                 <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] mb-8">
                    <ExternalLink className="h-16 w-16 text-emerald-400 mb-4 mx-auto" />
                    <p className="text-white font-bold mb-2">Redirecionado para InfinitePay</p>
                    <p className="text-zinc-500 text-xs">Complete o pagamento na janela aberta.</p>
                 </div>

                 <div className="flex items-center gap-2 mb-6">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-[11px] font-black text-green-500 uppercase tracking-widest">
                     Aguardando confirmação do banco...
                   </p>
                 </div>
               </>
             ) : (
               <>
                 {/* Fallback: Sem gateway configurado */}
                 <div className="bg-white p-6 rounded-[3rem] mb-8 shadow-[0_30px_70px_rgba(255,255,255,0.1)] border border-white/20">
                    <div className="h-56 w-56 bg-zinc-100 rounded-[2rem] flex items-center justify-center relative overflow-hidden">
                       <QrCode className="h-40 w-40 text-black/10" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Landmark className="h-12 w-12 text-black/40" />
                       </div>
                    </div>
                 </div>

                 {pixError ? (
                   <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                     <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                     <p className="text-xs text-red-400 font-bold text-left">{pixError}</p>
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                     <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                     <p className="text-xs text-yellow-400 font-bold text-left">
                       Gateway não configurado. Solicite o pagamento ao garçom ou use o botão abaixo.
                     </p>
                   </div>
                 )}
               </>
             )}

             <div className="mb-8">
                <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Total a Pagar</p>
                <p className="text-5xl font-black text-white tracking-tighter">{fmt(myPart)}</p>
             </div>

             <div className="w-full space-y-4">
                {/* Copia e Cola — só se tiver QR real */}
                {pixData?.qr_code_text && (
                  <button 
                    onClick={copyPix}
                    className="btn-modern w-full bg-white/5 border border-white/10 text-white rounded-3xl py-5 font-black tracking-tight shadow-xl flex items-center justify-center gap-2"
                  >
                    <Copy className="h-5 w-5" /> Copiar Código Copia e Cola
                  </button>
                )}

                {/* Checkout URL — só para InfinitePay */}
                {pixData?.checkout_url && (
                  <a 
                    href={pixData.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-modern w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-3xl py-5 font-black tracking-tight shadow-xl flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-5 w-5" /> Abrir Página de Pagamento
                  </a>
                )}
                
                {/* Botão manual — só quando sem gateway */}
                {!pixData?.qr_code_base64 && !pixData?.checkout_url && (
                  <button 
                    onClick={handleManualConfirm}
                    disabled={loading}
                    className="btn-modern btn-orange-glow w-full rounded-3xl py-5 text-lg font-black shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                    Confirmar Pagamento (Manual)
                  </button>
                )}
             </div>
          </div>
        )}

        {step === "success" && (
          <div className="px-8 pb-20 flex flex-col items-center text-center py-16 animate-in fade-in zoom-in-95 duration-700">
             <div className="h-32 w-32 rounded-full bg-green-500 flex items-center justify-center mb-8 shadow-3xl shadow-green-500/40 border-4 border-white/20">
                <CheckCircle2 className="h-16 w-16 text-white" />
             </div>
             <h2 className="text-4xl font-black text-white mb-3 tracking-tighter leading-tight">Pagamento<br/>Confirmado!</h2>
             <p className="text-zinc-400 font-bold mb-4 text-lg">Seu valor de <span className="text-white">{fmt(myPart)}</span> foi processado.</p>
             
             {pixData?.provider && (
               <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest mb-8">
                 via {pixData.provider === "mercadopago" ? "Mercado Pago" : pixData.provider === "infinitepay" ? "InfinitePay" : "PIX"}
               </p>
             )}
             
             <button 
               onClick={onClose}
               className="btn-modern w-full bg-white text-black rounded-[2rem] py-6 font-black text-xl shadow-2xl active:scale-95 transition-all"
             >
               Voltar para o Menu
             </button>
          </div>
        )}
      </div>
    </>
  );
}
