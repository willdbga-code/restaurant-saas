"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { db } from "@/lib/firebase/config";
import { ChefHat, Loader2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";



export default function LoginPage() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialMode = searchParams?.get("register") === "true" ? false : true;

  const [isLogin, setIsLogin] = useState(initialMode);
  const [loading, setLoading] = useState(false);

  // Campos
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");

  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    const invId = searchParams?.get("invite");
    if (invId) {
      setInviteId(invId);
      // Busca info do convite para pre-encher
      getDoc(doc(db, "invitations", invId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setInviteData(data);
          setEmail(data.email || "");
          setName(data.name || "");
        }
      });
    }
  }, [searchParams]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        
        if (inviteId) {
          // --- Se o usuário já tem conta e está fazendo login para aceitar um novo convite ---
          const claimFn = httpsCallable(functions, "setCustomClaimsAndProfile");
          await claimFn({
            action: "claim_invitation",
            inviteId: inviteId,
            name: name,
          });
          toast.success("Convite aceito! Seu perfil foi atualizado.");
        } else {
          toast.success("Login realizado com sucesso!");
        }
        
        router.push("/admin");
      } else {

        // Fluxo de Cadastro
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        const userId = userCred.user.uid;

        if (inviteId) {
          // --- Fluxo de Membro Convidado ---
          const claimFn = httpsCallable(functions, "setCustomClaimsAndProfile");
          await claimFn({
            action: "claim_invitation",
            inviteId: inviteId,
            name: name,
          });
          toast.success("Convite aceito! Bem-vindo à equipe.");
        } else {
          // --- Fluxo de Onboarding de Novo Dono ---
          const restaurantId = "rest_" + Date.now().toString(36);
          const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

          await setDoc(doc(db, "restaurants", restaurantId), {
            restaurant_id: restaurantId,
            name: restaurantName,
            slug: cleanSlug,
            owner_uid: userId,
            is_active: true,
            created_at: serverTimestamp(),
          });

          await setDoc(doc(db, "users", userId), {
            uid: userId,
            restaurant_id: restaurantId,
            role: "admin",
            name: name,
            email: email,
            created_at: serverTimestamp(),
          });
          toast.success("Conta criada! Bem-vindo ao seu painel.");
        }

        router.push("/admin");
      }

    } catch (err: any) {
      console.error("Login/Register Erro Detalhado:", err);
      
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        toast.error("Email ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        if (inviteId) {
          toast.info("Este e-mail já tem conta! Faça login para aceitar o convite.");
          setIsLogin(true);
        } else {
          toast.error("E-mail já cadastrado. Tente fazer login.");
        }
      } else {
        // Mostra a mensagem real do Firebase/Cloud Function
        const msg = err?.message || "Erro inesperado ao autenticar.";
        toast.error(msg);
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">RestaurantOS</h2>
          </div>

          <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-white">
            {isLogin ? "Entre na sua conta" : "Crie o seu restaurante"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              {isLogin ? "Cadastre-se grátis" : "Faça login"}
            </button>
          </p>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-white">Seu Nome</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} type="text" className="mt-2 block w-full rounded-md border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6" />
                  </div>
                  {!inviteId && (
                    <>
                      <div>
                        <label className="block text-sm font-medium leading-6 text-white">Nome do Restaurante</label>
                        <input required value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} type="text" className="mt-2 block w-full rounded-md border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium leading-6 text-white">Slug (para o QR Menu)</label>
                        <input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="meu-restaurante" type="text" className="mt-2 block w-full rounded-md border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6" />
                      </div>
                    </>
                  )}
                </>

              )}
              
              <div>
                <label className="block text-sm font-medium leading-6 text-white">Endereço de Email</label>
                <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="mt-2 block w-full rounded-md border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6" />
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-white">Senha</label>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} className="mt-2 block w-full rounded-md border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6" />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? "Entrar" : "Criar Conta")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          alt=""
        />
        <div className="absolute inset-0 bg-zinc-950/80 mix-blend-multiply" />
      </div>
    </div>
  );
}
