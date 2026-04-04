"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStaff } from "@/hooks/useStaff";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { Loader2, Plus, Users, Shield, ChefHat, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Link2, Mail, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";


const ROLE_ICONS = {
  admin: Shield,
  waiter: UserCircle,
  kitchen: ChefHat,
};

const ROLE_LABELS = {
  admin: "Administrador",
  waiter: "Garçom / Atendente",
  kitchen: "Cozinha / Bar",
};

export default function StaffPage() {
  const { user } = useAuth();
  const { staff, loading } = useStaff(user?.restaurant_id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "waiter" as "admin" | "waiter" | "kitchen",
  });

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleInvite() {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error("Preencha nome, e-mail e cargo.");
      return;
    }
    setSubmitting(true);
    try {
      // Cria o convite no Firestore
      const docRef = await addDoc(collection(db, "invitations"), {
        restaurant_id: user?.restaurant_id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: "pending",
        created_at: serverTimestamp(),
      });

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${baseUrl}/invite/${docRef.id}`;
      setInviteLink(link);
      
      toast.success(`Convite para ${formData.name} gerado!`);
      // Não fechamos o diálogo ainda, vamos mostrar o link
    } catch (error: any) {
      console.error("Staff Invite Error:", error);
      toast.error("Erro ao gerar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipe</h1>
          <p className="mt-1 text-sm text-zinc-400">Gerencie o acesso de garçons, atendentes e cozinha ao sistema.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" /> Novo Membro
        </Button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {staff.map((member) => {
          const Icon = ROLE_ICONS[member.role] || Users;
          return (
            <div key={member.uid} className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 p-6 transition-all hover:border-zinc-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <Icon className={cn("h-6 w-6", member.role === "admin" ? "text-blue-400" : member.role === "kitchen" ? "text-orange-400" : "text-zinc-400")} />
              </div>
              <h3 className="text-lg font-bold text-white">{member.name}</h3>
              <p className="mt-1 text-xs text-zinc-500">{member.email}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  member.role === "admin" ? "bg-blue-500/10 text-blue-400" :
                  member.role === "kitchen" ? "bg-orange-500/10 text-orange-400" :
                  "bg-zinc-800 text-zinc-300"
                )}>
                  {ROLE_LABELS[member.role] || member.role}
                </span>
                {member.uid === user?.uid && (
                  <span className="text-[10px] font-bold uppercase text-zinc-600">Você</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Crie uma conta para o seu funcionário acessar o KDS ou PDV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-300">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ex: João Silva"
                className="border-zinc-700 bg-zinc-900 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))}
                placeholder="Ex: joao@restaurante.com"
                className="border-zinc-700 bg-zinc-900 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-zinc-300">Cargo / Acesso</Label>
              <Select value={formData.role} onValueChange={(v: any) => setFormData((s) => ({ ...s, role: v }))}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                  <SelectItem value="waiter">Garçom (Acesso ao PDV e Mesas)</SelectItem>
                  <SelectItem value="kitchen">Cozinha (Acesso apenas ao KDS)</SelectItem>
                  <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteLink && (
              <div className="mt-4 space-y-3 rounded-lg bg-orange-500/10 p-4 border border-orange-500/20">
                <div className="flex items-center gap-2 text-orange-400">
                  <Link2 className="h-4 w-4" />
                  <span className="text-sm font-bold">Link de Convite Gerado</span>
                </div>
                <p className="text-xs text-zinc-400">Envie este link para o funcionário criar a conta:</p>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={inviteLink} 
                    className="h-8 border-zinc-700 bg-zinc-900 text-[10px] text-zinc-300"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => copyToClipboard(inviteLink)}
                    className="h-8 bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>


          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setDialogOpen(false);
                setInviteLink(null);
                setFormData({ name: "", email: "", password: "", role: "waiter" });
              }} 
              className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {inviteLink ? "Fechar" : "Cancelar"}
            </Button>
            {!inviteLink && (
              <Button onClick={handleInvite} disabled={submitting} className="bg-orange-500 text-white hover:bg-orange-600">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar Link de Convite
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
