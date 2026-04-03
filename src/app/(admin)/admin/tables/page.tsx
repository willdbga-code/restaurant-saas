"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, QrCode, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTables } from "@/hooks/useTables";
import { useRestaurant } from "@/hooks/useRestaurant";
import { addTable, updateTable, deleteTable, Table as RestTable } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STATUS_LABELS: Record<RestTable["status"], string> = {
  available: "Disponível",
  occupied: "Ocupada",
  reserved: "Reservada",
  cleaning: "Limpeza",
};

const STATUS_COLORS: Record<RestTable["status"], string> = {
  available: "bg-green-500/20 text-green-400",
  occupied: "bg-red-500/20 text-red-400",
  reserved: "bg-yellow-500/20 text-yellow-400",
  cleaning: "bg-blue-500/20 text-blue-400",
};

type FormData = { label: string; number: number; capacity: number };
const emptyForm: FormData = { label: "", number: 1, capacity: 2 };

// Removido Mock: const RESTAURANT_SLUG = "demo-restaurante";

export default function TablesPage() {
  const { user } = useAuth();
  const { restaurant } = useRestaurant(user?.restaurant_id);
  const { tables, loading } = useTables(user?.restaurant_id);

  const restaurantSlug = restaurant?.slug || "demo-restaurante";

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RestTable | null>(null);
  const [viewQr, setViewQr] = useState<RestTable | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setForm({ label: "", number: (tables.length || 0) + 1, capacity: 2 });
    setOpen(true);
  }

  function openEdit(t: RestTable) {
    setEditTarget(t);
    setForm({ label: t.label, number: t.number, capacity: t.capacity });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim() || !user?.restaurant_id) return;
    setSaving(true);
    try {
      if (editTarget) {
        const qr_target_url = `/menu/${restaurantSlug}?table=${editTarget.id}`;
        await updateTable(editTarget.id, { 
          label: form.label, 
          number: form.number, 
          capacity: form.capacity,
          qr_target_url
        });
        toast.success("Mesa atualizada!");
      } else {
        const docRef = await addTable(user.restaurant_id, {
          label: form.label,
          number: form.number,
          capacity: form.capacity,
          qr_code_url: null,
          qr_target_url: "", // Temporário
          status: "available",
          current_order_id: null,
          is_active: true,
        });
        // Atualiza com o ID real para o QR sincronizar
        await updateTable(docRef.id, { 
          qr_target_url: `/menu/${restaurantSlug}?table=${docRef.id}` 
        });
        toast.success("Mesa criada!");
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar. Verifique o Firestore.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(t: RestTable, status: RestTable["status"]) {
    try {
      await updateTable(t.id, { status });
      toast.success(`Status de "${t.label}" atualizado.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar status.");
    }
  }

  async function handleDelete(t: RestTable) {
    if (!confirm(`Remover "${t.label}"?`)) return;
    try {
      if (!user?.restaurant_id) return;
      await deleteTable(t.id, user.restaurant_id);
      toast.success("Mesa removida.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover mesa.");
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesas</h1>
          <p className="mt-1 text-sm text-zinc-400">Configure o salão e gerencie status em tempo real.</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" /> Nova Mesa
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : tables.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Nenhuma mesa cadastrada. Clique em &quot;Nova Mesa&quot; para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Mesa</TableHead>
                <TableHead className="text-zinc-400">Capacidade</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">QR Code URL</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-white">{t.label}</TableCell>
                  <TableCell className="text-zinc-400">{t.capacity} pessoas</TableCell>
                  <TableCell>
                    <Select
                      value={t.status}
                      onValueChange={(v) => handleStatusChange(t, v as RestTable["status"])}
                    >
                      <SelectTrigger className={`h-7 w-32 border-0 px-2 text-xs font-medium ${STATUS_COLORS[t.status]} rounded-md`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <QrCode className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[180px]">{t.qr_target_url}</span>
                    </div>
                  </TableCell>
                   <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        title="Testar Mesa (Abrir Menu)"
                        onClick={() => window.open(t.qr_target_url, "_blank")}
                        className="h-8 w-8 text-orange-400 hover:text-orange-500 hover:bg-orange-500/10"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        title="Ver QR Code"
                        onClick={() => setViewQr(t)}
                        className="h-8 w-8 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(t)} className="h-8 w-8 text-zinc-400 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Mesa" : "Nova Mesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="table-label">Identificação *</Label>
              <Input id="table-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex: Mesa 01, Balcão, Varanda" className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="table-num">Número</Label>
                <Input id="table-num" type="number" value={form.number}
                  onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                  className="border-zinc-700 bg-zinc-900 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="table-cap">Capacidade</Label>
                <Input id="table-cap" type="number" value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="border-zinc-700 bg-zinc-900 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.label.trim()} className="bg-orange-500 text-white hover:bg-orange-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Salvar Alterações" : "Criar Mesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* QR Code Viewer Dialog */}
      <Dialog open={!!viewQr} onOpenChange={() => setViewQr(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mesa {viewQr?.number} — QR Code</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6 text-center">
            <div className="p-4 bg-white rounded-3xl shadow-xl mb-6 ring-4 ring-orange-500/10">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  (typeof window !== "undefined" ? window.location.origin : "") + (viewQr?.qr_target_url || "")
                )}`}
                alt="QR Code"
                className="h-64 w-64"
              />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Mesa {viewQr?.number}</h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-[250px]">
               Imprima este QR Code e cole na mesa para que seus clientes acessem o cardápio.
            </p>

            <div className="grid grid-cols-1 gap-3 w-full">
               <Button 
                 onClick={() => window.print()}
                 className="bg-orange-500 text-white font-black hover:bg-orange-400"
               >
                 Imprimir QR Code
               </Button>
               <Button variant="ghost" onClick={() => setViewQr(null)} className="text-zinc-500">
                  Fechar
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
