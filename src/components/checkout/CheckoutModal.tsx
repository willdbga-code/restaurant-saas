"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, CreditCard, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { createCheckoutLink } from "@/app/actions/checkout";
import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: "essential" | "pro";
  restaurantId?: string;
  isAnnual?: boolean;
}

export function CheckoutModal({ isOpen, onClose, planId, restaurantId, isAnnual }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const isPro = planId === "pro";
  const monthlyPrice = isPro ? "300" : "150";
  const annualTotal = isPro ? "3.000" : "1.500";
  const price = isAnnual ? annualTotal : monthlyPrice;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const result = await createCheckoutLink(planId, {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
      }, restaurantId, isAnnual);

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] pointer-events-none" />
        
        <div className="p-8">
          <DialogHeader className="mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 mb-4">
               {isPro ? <Zap className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase leading-none">
              Assinar Plano <span className="text-orange-500">{isPro ? "Premium Pro" : "Essencial"}</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-bold mt-2">
               Estamos quase lá! Preencha os dados abaixo para gerar seu link de pagamento seguro via **InfinitePay**.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-500">Nome Completo</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-900 border-zinc-800 h-12 focus:ring-orange-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-zinc-500">Email Profissional</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-900 border-zinc-800 h-12 focus:ring-orange-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-zinc-500">WhatsApp (com DDD)</Label>
              <Input 
                id="phone" 
                placeholder="+55 (11) 99999-9999" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-zinc-900 border-zinc-800 h-12 focus:ring-orange-500/20"
              />
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between mt-8">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor do Plano ({isAnnual ? "Anual" : "Mensal"})</p>
                <p className="text-2xl font-black text-white">R$ {price}<span className="text-sm text-zinc-500">{isAnnual ? "/ano" : "/mês"}</span></p>
                {isAnnual && (
                  <div className="mt-1">
                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">2 meses grátis aplicados!</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Ou em até 12x no cartão de crédito</p>
                  </div>
                )}
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500/50" />
            </div>

            <Button 
               type="submit" 
               disabled={loading}
               className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-orange-500/20"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" /> 
                  Gerar Link de Pagamento
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[10px] text-zinc-600 font-bold mt-6 uppercase tracking-tight">
             Checkout 100% Seguro • Ativação Imediata após o PIX/Cartão
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Rocket = ({ className }: { className?: string }) => (
  <ChefHat className={className} />
);
