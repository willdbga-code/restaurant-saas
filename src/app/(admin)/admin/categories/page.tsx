"use client";

import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X } from "lucide-react";
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
};

const emptyForm: FormData = { name: "", description: "", sort_order: 0, image_url: null };

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
      image_url: cat.image_url 
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
          image_url: form.image_url 
        });
        toast.success("Categoria atualizada!");
      } else {
        await addCategory(user.restaurant_id, {
          name: form.name,
          description: form.description || null,
          image_url: form.image_url,
          sort_order: form.sort_order,
          is_active: true,
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

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Nenhuma categoria ainda. Clique em &quot;Nova Categoria&quot; para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Foto</TableHead>
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Descrição</TableHead>
                <TableHead className="text-zinc-400">Ordem</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
