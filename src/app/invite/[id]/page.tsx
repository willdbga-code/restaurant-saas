"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { ChefHat, Loader2, UserPlus, Shield, UserCircle, ChefHat as KitchenIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Administrador",
  waiter: "Garçom / Atendente",
  kitchen: "Cozinha / Bar",
};

const ROLE_ICONS = {
  admin: Shield,
  waiter: UserCircle,
  kitchen: KitchenIcon,
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const inviteSnap = await getDoc(doc(db, "invitations", inviteId));
        if (!inviteSnap.exists()) {
          setError("Convite não encontrado ou expirado.");
          return;
        }

        const inviteData = inviteSnap.data();
        if (inviteData.status !== "pending") {
          setError("Este convite já foi utilizado ou cancelado.");
          return;
        }

        setInvitation(inviteData);

        // Busca Info do Restaurante
        const restSnap = await getDoc(doc(db, "restaurants", inviteData.restaurant_id));
        if (restSnap.exists()) {
          setRestaurant(restSnap.data());
        }
      } catch (err) {
        console.error("Invite Fetch Error:", err);
        setError("Erro ao carregar o convite.");
      } finally {
        setLoading(false);
      }
    }

    if (inviteId) fetchInvite();
  }, [inviteId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="mt-4 text-zinc-400">Validando convite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-red-400 border border-zinc-800">
          <ChefHat className="h-8 w-8 opacity-20" />
        </div>
        <h1 className="mt-6 text-xl font-bold">Ops! Algo deu errado.</h1>
        <p className="mt-2 text-zinc-400 max-w-xs">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => router.push("/")}
          className="mt-8 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          Voltar para o Início
        </Button>
      </div>
    );
  }

  const Icon = ROLE_ICONS[invitation.role as keyof typeof ROLE_ICONS] || UserCircle;

  return (
    <div className="flex min-h-screen bg-zinc-950 selection:bg-orange-500/30">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter">RestaurantOS</h2>
          </div>

          <div className="mt-12 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20">
                Convite para Equipe
              </span>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Você foi convidado!
              </h1>
              <p className="text-zinc-400 leading-relaxed">
                <span className="text-white font-semibold">{restaurant?.name || "O restaurante"}</span> te convidou para fazer parte da equipe.
              </p>
            </div>

            <div className="group relative flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-orange-500/50 hover:bg-zinc-900">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-orange-400 group-hover:scale-110 transition-transform">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Seu Cargo será</p>
                <p className="text-lg font-bold text-white">
                  {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] || invitation.role}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => router.push(`/login?register=true&invite=${inviteId}`)}
                className="w-full gap-2 bg-orange-500 py-6 text-lg font-bold text-white shadow-xl shadow-orange-500/20 hover:bg-orange-400 active:scale-[0.98] transition-all"
              >
                Aceitar Convite e Criar Conta
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="mt-4 text-center text-xs text-zinc-500">
                Ao clicar em aceitar, você será redirecionado para criar seu acesso.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Side */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          className="absolute inset-0 h-full w-full object-cover grayscale opacity-30 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop"
          alt="Restaurant background"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium italic text-zinc-300">
              "A tecnologia deve ser o braço direito do bom atendimento."
            </p>
            <footer className="text-sm font-bold uppercase tracking-widest text-orange-500">
              — RestaurantOS Team
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
