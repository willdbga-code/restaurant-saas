"use client";

import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, ImagePlus, GlassWater, Utensils } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { addCategory, updateCategory, deleteCategory, Category } from "@/lib/firebase/firestore";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  description: string;
  sort_order: number;
  image_url: string | null;
  is_bar: boolean;
};

const emptyForm: FormData = { name: "", description: "", sort_order: 0, image_url: null, is_bar: false };

// ─── Image Upload Field ───────────────────────────────────────────────────────
function ImageUploadField({
  restaurantId,
  currentUrl,
  onChange,
}: {
  restaurantId: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      const storageRef = ref(storage, `restaurants/${restaurantId}/categories/${crypto.randomUUID()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      onChange(downloadUrl);
      toast.success("Imagem da categoria enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="relative">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-zinc-700 group h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm text-white font-semibold backdrop-blur-md"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trocar"}
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 p-2 text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full h-32 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
            "border-zinc-700 text-zinc-500 hover:border-orange-500 hover:text-orange-400"
          )}
        >
          {uploading ? (
            <><Loader2 className="h-6 w-6 animate-spin mb-2" /><span className="text-xs">Enviando...</span></>
          ) : (
            <><ImagePlus className="h-6 w-6 mb-2" /><span className="text-sm font-medium">Foto da Categoria</span></>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { categories, loading } = useCategories(user?.restaurant_id);

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setForm({ 
      name: cat.name, 
      description: cat.description ?? "", 
      sort_order: cat.sort_order,
      image_url: cat.image_url,
      is_bar: cat.is_bar ?? false,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !user?.restaurant_id) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, { 
          name: form.name, 
          description: form.description || null, 
          sort_order: form.sort_order,
          image_url: form.image_url,
          is_bar: form.is_bar,
        });
        toast.success("Categoria atualizada!");
      } else {
        await addCategory(user.restaurant_id, {
          name: form.name,
          description: form.description || null,
          image_url: form.image_url,
          sort_order: form.sort_order,
          is_active: true,
          is_bar: form.is_bar,
        });
        toast.success("Categoria criada!");
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Remover "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      toast.success("Categoria removida.");
    } catch (e) {
      toast.error("Erro ao remover categoria.");
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias</h1>
          <p className="mt-1 text-sm text-zinc-400">Organize os grupos do seu cardápio com identificação visual.</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Responsive View: Table for Desktop, Cards for Mobile */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Nenhuma categoria ainda. Clique em &quot;Nova Categoria&quot; para começar.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Foto</TableHead>
                    <TableHead className="text-zinc-400">Nome</TableHead>
                    <TableHead className="text-zinc-400">Descrição</TableHead>
                    <TableHead className="text-zinc-400">Ordem</TableHead>
                    <TableHead className="text-zinc-400">Estação</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-right text-zinc-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell>
                        {cat.image_url ? (
                          <img src={cat.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-zinc-700" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-600 text-center uppercase font-bold px-1">
                            No Img
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-white">{cat.name}</TableCell>
                      <TableCell className="text-zinc-400">{cat.description ?? "—"}</TableCell>
                      <TableCell className="text-zinc-400">{cat.sort_order}</TableCell>
                      <TableCell>
                        {cat.is_bar ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                            <GlassWater className="h-3 w-3" /> Bar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/20">
                            <Utensils className="h-3 w-3" /> Cozinha
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.is_active ? "default" : "secondary"} className={cat.is_active ? "bg-green-500/10 text-green-400 hover:bg-green-500/10 border-green-500/20" : ""}>
                          {cat.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(cat)} className="h-8 w-8 text-zinc-400 hover:text-white">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(cat)} className="h-8 w-8 text-zinc-400 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 divide-y divide-zinc-800 md:hidden">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-zinc-800" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 text-center uppercase font-bold px-1">
                          No Img
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white leading-tight">{cat.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{cat.description || "Sem descrição"}</p>
                      </div>
                    </div>
                    <Badge variant={cat.is_active ? "default" : "secondary"} className={cat.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                       {cat.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ordem: {cat.sort_order}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(cat)} className="h-9 px-4 rounded-xl bg-zinc-800 text-white border-zinc-700">
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(cat)} className="h-9 w-9 p-0 text-zinc-500 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            
            {/* Category Image */}
            <div className="space-y-1.5">
              <Label>Imagem da Categoria (Opcional)</Label>
              <ImageUploadField
                restaurantId={user?.restaurant_id ?? ""}
                currentUrl={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nome *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Entradas, Bebidas..."
                className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Descrição</Label>
              <Input
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Melhores cortes de carne..."
                className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Ordem de exibição</Label>
              <Input
                id="cat-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="border-zinc-700 bg-zinc-900 text-white"
              />
            </div>

            {/* Bar Station Toggle */}
            <div
              onClick={() => setForm({ ...form, is_bar: !form.is_bar })}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                form.is_bar
                  ? "border-indigo-500/40 bg-indigo-500/10"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  form.is_bar ? "bg-indigo-500/20" : "bg-zinc-800"
                }`}>
                  {form.is_bar
                    ? <GlassWater className="h-4 w-4 text-indigo-400" />
                    : <Utensils className="h-4 w-4 text-zinc-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {form.is_bar ? "Roteada para o Bar" : "Roteada para a Cozinha"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {form.is_bar
                      ? "Itens desta categoria vão para o KDS Bar"
                      : "Itens desta categoria vão para o KDS Cozinha"}
                  </p>
                </div>
              </div>
              <div className={`h-5 w-9 rounded-full transition-colors relative ${
                form.is_bar ? "bg-indigo-500" : "bg-zinc-700"
              }`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  form.is_bar ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-orange-500 text-white hover:bg-orange-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
