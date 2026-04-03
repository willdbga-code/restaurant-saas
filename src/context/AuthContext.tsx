"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { addSystemLog } from "@/lib/firebase/firestore";

type AuthUser = {
  uid: string;
  name: string;
  email: string | null;
  restaurant_id: string;
  role: "admin" | "waiter" | "kitchen" | "customer" | "superadmin";
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  impersonate_rest: (id: string | null) => void;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  logout: async () => {},
  impersonate_rest: () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);

  // Inicialização: Tenta recuperar o ID recuperado do localStorage (Apenas no Cliente)
  useEffect(() => {
    const savedId = localStorage.getItem("saas_impersonated_id");
    if (savedId) {
      setImpersonatedId(savedId);
    }
  }, []);

  // Persistência: Salva no localStorage quando o ID mudar
  useEffect(() => {
    if (impersonatedId) {
      localStorage.setItem("saas_impersonated_id", impersonatedId);
    } else {
      localStorage.removeItem("saas_impersonated_id");
    }
  }, [impersonatedId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Super Admin (Vendedor SaaS)
        // Super Admin (Vendedor SaaS) - BYPASS ABSOLUTO
        const currentUserEmail = firebaseUser.email?.toLowerCase();
        if (currentUserEmail === "willdbga@gmail.com") {
          console.log("👑 AuthContext: Super Admin Privilegiado!", currentUserEmail);
          
          addSystemLog({
            type: "auth",
            message: `Super Admin logado: ${currentUserEmail}`,
            restaurant_id: "master",
            metadata: { uid: firebaseUser.uid }
          });

          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Super Admin",
            email: firebaseUser.email,
            restaurant_id: impersonatedId || "master",
            role: "superadmin",
          });
          setLoading(false);
          return;
        }

        // Cliente anônimo (QR Menu)
        if (firebaseUser.isAnonymous) {
          setUser({
            uid: firebaseUser.uid,
            name: "Cliente",
            email: null,
            restaurant_id: "",
            role: "customer",
          });
          setLoading(false);
          return;
        }

        // 1. Tenta pegar os Custom Claims (definidos pela Cloud Function)
        let tokenResult = await firebaseUser.getIdTokenResult();
        let claims = tokenResult.claims;

        // AUTO-HEALING: Se logado mas sem claims, força refresh uma vez
        if (!claims.restaurant_id && !firebaseUser.isAnonymous) {
          console.log("🛠️ AuthContext: Tentando recuperar claims via forceRefresh...");
          tokenResult = await firebaseUser.getIdTokenResult(true);
          claims = tokenResult.claims;
        }

        if (claims.restaurant_id && claims.role) {
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Usuário",
            email: firebaseUser.email,
            restaurant_id: claims.restaurant_id as string,
            role: claims.role as AuthUser["role"],
          });
        } else {
          // 2. Fallback: lê o documento users/{uid} no Firestore
          // (funciona quando a Cloud Function não está deployada ou em caso de latência de claims)
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Se o documento existe e tem restaurant_id, mas o token não tinha, 
            // avisamos que estamos em modo fallback (regras de segurança podem sofrer)
            console.warn("⚠️ AuthContext: Usando fallback do Firestore para restaurant_id.");
            
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || userData.name || "Usuário",
              email: firebaseUser.email,
              restaurant_id: userData.restaurant_id as string,
              role: userData.role as AuthUser["role"],
            });
          } else {
            console.warn("❌ Usuário sem claims e sem documento no Firestore.");
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do usuário", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function logout() {
    try {
      localStorage.removeItem("saas_impersonated_id");
      setImpersonatedId(null);
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao fazer logout", err);
    }
  }

  function impersonate_rest(id: string | null) {
    setImpersonatedId(id);
  }

  // Efeito para re-sincronizar o usuário quando o impersonatedId mudar
  useEffect(() => {
    if (user?.role === "superadmin") {
      setUser(prev => prev ? { ...prev, restaurant_id: impersonatedId || "master" } : null);
    }
  }, [impersonatedId]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, impersonate_rest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
