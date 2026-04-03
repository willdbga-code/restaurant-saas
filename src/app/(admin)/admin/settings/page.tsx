"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { updateRestaurantSettings } from "@/lib/firebase/firestore";
import { Loader2, Building, Save, UtensilsCrossed, LogOut, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { restaurant, loading } = useRestaurant(user?.restaurant_id);
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    phone: "",
    logo_url: "",
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        slug: restaurant.slug || "",
        phone: restaurant.phone || "",
        logo_url: restaurant.logo_url || "",
      });
    }
  }, [restaurant]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant?.id) return;
    if (user?.role !== "admin") {
      toast.error("Acesso negado. Apenas o dono pode alterar as configurações.");
      return;
    }

    setSaving(true);
    try {
      await updateRestaurantSettings(restaurant.id, formData);
      toast.success("Configurações atualizadas com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configurações do Restaurante</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gerencie a identidade visual e dados do seu estabelecimento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Identity Form */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Perfil do Menu Digital</h2>
                <p className="text-sm text-zinc-400">Exibido na URL e topo do cardápio.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-zinc-300">Nome do Restaurante</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                  className="border-zinc-700 bg-zinc-950 text-white"
                  disabled={user?.role !== "admin"}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug" className="text-zinc-300">URL Slug / Link</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-zinc-700 bg-zinc-800 px-3 text-xs text-zinc-500">
                    /menu/
                  </span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    className="rounded-l-none border-zinc-700 bg-zinc-950 text-white"
                    disabled={user?.role !== "admin"}
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Não use espaços. Apenas minúsculas e hífen.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-zinc-300">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="border-zinc-700 bg-zinc-950 text-white"
                  disabled={user?.role !== "admin"}
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="logo_url" className="text-zinc-300">URL do Logotipo (Opcional)</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData((s) => ({ ...s, logo_url: e.target.value }))}
                  placeholder="https://sua-imagem.com/logo.png"
                  className="border-zinc-700 bg-zinc-950 text-white"
                  disabled={user?.role !== "admin"}
                />
                <p className="text-xs text-zinc-500">Link direto da imagem para exibir no menu.</p>
              </div>

              {user?.role === "admin" && (
                <div className="sm:col-span-2 pt-4">
                  <Button type="submit" disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* User Card & Integrations */}
        <div className="col-span-1 space-y-6">
          {/* Nova Seção de Integrações */}
          <div 
            onClick={() => router.push("/admin/settings/integrations")}
            className="group cursor-pointer p-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">Hub de Integrações</h3>
                <p className="text-zinc-500 text-xs font-bold leading-tight">Vincule Mercado Pago, Stone e outros bancos.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto group-hover:text-blue-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                <Building className="h-6 w-6" />
              </div>
              <div className="overflow-hidden">
                <h2 className="truncate text-lg font-bold text-white max-w-full break-all">{user.name}</h2>
                <p className="text-sm font-medium text-blue-400 capitalize">{user.role}</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">ID: {user.restaurant_id}</p>
              </div>
            </div>
            
            <div className="pt-6">
              <Button 
                onClick={handleLogout}
                variant="destructive"
                className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair da Conta (Logout)
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
