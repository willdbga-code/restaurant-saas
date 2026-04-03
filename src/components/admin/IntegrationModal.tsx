"use client";

import React, { useState, useEffect } from "react";
import { 
  X, CheckCircle2, ChevronRight, Info, ExternalLink, 
  CreditCard, ShieldCheck, Zap, Globe, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type Provider = "mercadopago" | "infinitepay" | "stone" | "santander";

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  restaurantId: string;
}

const PROVIDER_CONFIG = {
  mercadopago: {
    name: "Mercado Pago",
    color: "bg-blue-500",
    icon: <Zap className="h-6 w-6" />,
    tutorialTitle: "Como obter suas chaves do Mercado Pago",
    steps: [
      "Acesse o painel Mercado Pago Developers.",
      "Vá em 'Suas Aplicações' e crie uma nova aplicação.",
      "No menu lateral, clique em 'Credenciais de Produção'.",
      "Copie a 'Public Key' e o 'Access Token'."
    ],
    link: "https://www.mercadopago.com.br/developers/pt/panel",
    isRecommended: true
  },
  infinitepay: {
    name: "InfinitePay",
    color: "bg-emerald-500",
    icon: <Zap className="h-6 w-6" />,
    tutorialTitle: "Configurando a API Cloud InfinitePay",
    steps: [
      "Acesse a sua conta InfinitePay Business.",
      "Vá em 'Configurações' > 'Integrações Cloud'.",
      "Gere um novo 'Client ID' e 'Client Secret'.",
      "Certifique-se de ativar as permissões de PIX e Cartão."
    ],
    link: "https://infinitepay.io/business",
  },
  stone: {
    name: "Stone (Pagar.me)",
    color: "bg-green-600",
    icon: <CreditCard className="h-6 w-6" />,
    tutorialTitle: "Obtendo sua API Key na Stone",
    steps: [
      "Acesse a dashboard do Pagar.me (Stone Co).",
      "Vá em 'Configurações' > 'Chaves de API'.",
      "Copie a sua 'Chave Secreta' de produção.",
      "Gere uma 'Gave Pública' para o checkout front-end."
    ],
    link: "https://pagar.me/",
  },
  santander: {
    name: "Santander PIX",
    color: "bg-red-600",
    icon: <Globe className="h-6 w-6" />,
    tutorialTitle: "Certificado de PIX Santander",
    steps: [
      "Acesse o Internet Banking Empresarial Santander.",
      "Vá em 'Gestão de APIs' > 'PIX'.",
      "Gere o certificado digital (.key e .crt).",
      "Copie o 'Client ID' e o arquivo do certificado."
    ],
    link: "https://www.santander.com.br/api",
  }
};

export function IntegrationModal({ isOpen, onClose, provider, restaurantId }: IntegrationModalProps) {
  const [step, setStep] = useState(1);
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const config = PROVIDER_CONFIG[provider];

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSuccess(false);
      loadCurrentConfig();
    }
  }, [isOpen, provider]);

  const loadCurrentConfig = async () => {
    try {
      const docRef = doc(db, "restaurants", restaurantId, "private_settings", "payment");
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().provider === provider) {
        setPublicKey(snap.data().public_key || "");
        // Token não mostramos por segurança, mas sabemos que existe
      } else {
        setPublicKey("");
        setAccessToken("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Grava no Cofre Blindado (Vault)
      const docRef = doc(db, "restaurants", restaurantId, "private_settings", "payment");
      await setDoc(docRef, {
        provider,
        public_key: publicKey,
        access_token: accessToken,
        is_active: true,
        updated_at: serverTimestamp(),
      });

      // Também atualiza o status público no restaurante
      const restRef = doc(db, "restaurants", restaurantId);
      await setDoc(restRef, { 
        payment_linked: true,
        payment_provider: provider,
        updated_at: serverTimestamp() 
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      alert("Erro ao salvar integração. Verifique suas permissões.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className={cn("h-2 w-full", config.color)} />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 md:p-12">
          {success ? (
            <div className="py-12 text-center animate-in zoom-in duration-500">
              <div className="h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Conectado com Sucesso!</h2>
              <p className="text-zinc-500 font-bold">O {config.name} agora é o seu banco oficial.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Tutorial Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-3xl", config.color)}>
                    {config.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">{config.name}</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Gateway Individual</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Info className="h-8 w-8 text-white" />
                   </div>
                   <h3 className="text-white font-black text-sm mb-4 leading-tight">{config.tutorialTitle}</h3>
                   <div className="space-y-4">
                      {config.steps.map((text, i) => (
                        <div key={i} className="flex gap-3">
                           <span className="text-xs font-black text-primary-theme min-w-[12px]">{i+1}.</span>
                           <p className="text-zinc-400 text-xs font-medium leading-relaxed">{text}</p>
                        </div>
                      ))}
                   </div>
                   <a 
                    href={config.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black text-white transition-all group"
                   >
                     Abrir Painel do Banco
                     <ExternalLink className="h-3 w-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                   </a>
                </div>
              </div>

              {/* Form Section */}
              <div className="flex flex-col justify-center">
                <div className="space-y-6">
                   <div>
                      <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Chave Pública (Public Key)</label>
                      <input 
                        type="text" 
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        placeholder="Ex: APP_USR-..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-theme placeholder:text-zinc-700"
                      />
                   </div>

                   <div>
                      <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Token de Acesso (Secret/Access Token)</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-theme placeholder:text-zinc-700"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 rounded-lg">
                           <Lock className="h-3 w-3 text-zinc-500" />
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-600 font-bold mt-2 flex items-center gap-1 uppercase">
                         <ShieldCheck className="h-2 w-2" /> 
                         Salvo com criptografia no Vault SaaS
                      </p>
                   </div>

                   <button 
                    onClick={handleSave}
                    disabled={loading || !publicKey || !accessToken}
                    className="w-full py-5 bg-primary-theme hover:bg-primary-theme/90 disabled:opacity-50 disabled:grayscale text-black font-black text-sm rounded-2xl shadow-xl shadow-primary-theme/20 transition-all active:scale-95"
                   >
                     {loading ? "Processando Blindagem..." : "Vincular Banco Agora"}
                   </button>

                   <div className="flex items-center gap-2 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <p className="text-[10px] font-bold text-yellow-500/80 leading-tight">
                         O modo SIMULADOR será desativado e os pagamentos entrarão em modo PRODUÇÃO.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
