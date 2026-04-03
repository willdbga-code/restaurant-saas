"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Palette, Image as ImageIcon, Type, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { updateRestaurantSettings } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/admin/ImageUploadField";

export default function BrandingPage() {
  const { user } = useAuth();
  const { restaurant, loading } = useRestaurant(user?.restaurant_id);
  const [saving, setSaving] = useState(false);

  const [branding, setBranding] = useState({
    primary_color: "#f97316",
    hero_title: "",
    hero_subtitle: "",
    cover_url: "",
  });
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setLogoUrl(restaurant.logo_url || null);
      if (restaurant.branding) {
        setBranding({
          primary_color: restaurant.branding.primary_color || "#f97316",
          hero_title: restaurant.branding.hero_title || "",
          hero_subtitle: restaurant.branding.hero_subtitle || "",
          cover_url: restaurant.branding.cover_url || "",
        });
      }
    }
  }, [restaurant]);

  async function handleSave() {
    if (!user?.restaurant_id) return;
    setSaving(true);
    try {
      await updateRestaurantSettings(user.restaurant_id, {
        logo_url: logoUrl,
        branding: branding
      });
      toast.success("Identidade visual atualizada com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Palette className="h-8 w-8 text-orange-500" />
            Identidade Visual
          </h1>
          <p className="text-zinc-400 mt-1">Personalize como os clientes veem o seu cardápio digital.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 px-8 rounded-2xl shadow-lg shadow-orange-500/20"
        >
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Logo do Restaurante */}
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 bg-white/[0.02] p-8">
              <div className="flex items-center gap-3 mb-1">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-white">Logo da Marca</CardTitle>
              </div>
              <CardDescription className="text-zinc-500">Aparecerá no topo do cardápio e nos comprovantes.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
               <ImageUploadField
                restaurantId={user?.restaurant_id || ""}
                currentUrl={logoUrl}
                onChange={(url) => setLogoUrl(url)}
                folder="branding"
                className="h-48"
              />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 bg-white/[0.02] p-8">
              <div className="flex items-center gap-3 mb-1">
                <Palette className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-white">Cores e Estilo</CardTitle>
              </div>
              <CardDescription className="text-zinc-500">Defina a cor principal da sua marca no cardápio.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest">Cor Primária do Tema</Label>
                <div className="flex items-center gap-4">
                  <div 
                    className="h-14 w-14 rounded-2xl border-4 border-zinc-800 shadow-inner" 
                    style={{ backgroundColor: branding.primary_color }}
                  />
                  <Input
                    type="color"
                    className="h-14 w-24 bg-zinc-950 border-zinc-800 rounded-2xl cursor-pointer p-1"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  />
                  <Input
                    type="text"
                    className="h-14 flex-1 bg-zinc-950 border-zinc-800 text-white font-mono rounded-2xl uppercase"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 bg-white/[0.02] p-8">
              <div className="flex items-center gap-3 mb-1">
                <Type className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-white">Boas-vindas (Landing Page)</CardTitle>
              </div>
              <CardDescription className="text-zinc-500">Configure os textos de impacto da primeira tela do cliente.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest">Título de Impacto</Label>
                  <Input
                    placeholder="Ex: O melhor hambúrguer artesanal da cidade"
                    className="h-14 bg-zinc-950 border-zinc-800 text-white rounded-2xl"
                    value={branding.hero_title}
                    onChange={(e) => setBranding({ ...branding, hero_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest">Subtítulo ou Chamada</Label>
                  <Input
                    placeholder="Ex: Peça agora e receba em casa em 40 minutos"
                    className="h-14 bg-zinc-950 border-zinc-800 text-white rounded-2xl"
                    value={branding.hero_subtitle}
                    onChange={(e) => setBranding({ ...branding, hero_subtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest">Imagem de Capa (Background)</Label>
                  <ImageUploadField
                    restaurantId={user?.restaurant_id || ""}
                    currentUrl={branding.cover_url}
                    onChange={(url) => setBranding({ ...branding, cover_url: url || "" })}
                    folder="branding"
                    className="h-40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview (Simulated) */}
        <div className="space-y-6">
          <Label className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest px-4">Pré-visualização Rápida</Label>
          <Card className="bg-zinc-950 border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl relative min-h-[500px]">
            {branding.cover_url ? (
              <img src={branding.cover_url} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            ) : (
              <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center opacity-40">
                <ImageIcon className="h-12 w-12 text-zinc-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            
            <div className="relative p-8 h-full flex flex-col justify-end text-center space-y-4 pb-12">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-zinc-800 border-2 border-white/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white/20" />
                </div>
              </div>
              <h4 className="text-2xl font-black text-white leading-tight">
                {branding.hero_title || "Seu Título Aqui"}
              </h4>
              <p className="text-zinc-400 text-sm">
                {branding.hero_subtitle || "Sua frase de impacto aparecerá aqui para o cliente."}
              </p>
              <div className="pt-6">
                <div 
                  className="h-12 w-full rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Ver Cardápio
                </div>
              </div>
            </div>
          </Card>
          
          <div className="p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
            <p className="text-[12px] text-orange-500/70 leading-relaxed italic">
              * O preview acima é uma simulação da primeira tela que o seu cliente verá ao entrar no cardápio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
