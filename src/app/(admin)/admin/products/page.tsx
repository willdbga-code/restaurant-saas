"use client";

import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, ImagePlus, X, ChefHat, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { addProduct, updateProduct, deleteProduct, Product } from "@/lib/firebase/firestore";
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
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  track_stock: boolean;
  stock: number;
  sort_order: number;
  ingredients: string[];
  image_url: string | null;
  is_featured: boolean;
};

const emptyForm: FormData = {
  name: "", description: "", price: "", category_id: "",
  track_stock: false, stock: 0, sort_order: 0,
  ingredients: [], image_url: null, is_featured: false,
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parsePriceToCents(value: string): number {
  const cleaned = value.replace(/[R$\s]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

// ─── Ingredients Tag Input ────────────────────────────────────────────────────
function IngredientInput({ ingredients, onChange }: { ingredients: string[]; onChange: (v: string[]) => void }) {
  const [inputVal, setInputVal] = useState("");

  function addIngredient() {
    const trimmed = inputVal.trim();
    if (!trimmed || ingredients.includes(trimmed)) return;
    onChange([...ingredients, trimmed]);
    setInputVal("");
  }

  function removeIngredient(ing: string) {
    onChange(ingredients.filter(i => i !== ing));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addIngredient();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addIngredient}
          placeholder='Ex: "Bacon" e aperte Enter'
          className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 flex-1"
        />
        <Button type="button" variant="outline" onClick={addIngredient} className="border-zinc-700 text-zinc-300 hover:text-white shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {ingredients.map(ing => (
            <span
              key={ing}
              className="flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 pl-3 pr-2 py-1 text-sm text-zinc-200"
            >
              {ing}
              <button type="button" onClick={() => removeIngredient(ing)} className="text-zinc-500 hover:text-red-400 transition-colors ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

import { ImageUploadField } from "@/components/admin/ImageUploadField";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useAuth();
  const { products, loading } = useProducts(user?.restaurant_id);
  const { categories } = useCategories(user?.restaurant_id);

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: (p.price / 100).toFixed(2).replace(".", ","),
      category_id: p.category_id ?? "",
      track_stock: p.track_stock,
      stock: p.stock,
      sort_order: p.sort_order,
      ingredients: p.ingredients ?? [],
      image_url: p.image_url,
      is_featured: p.is_featured ?? false,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category_id || !user?.restaurant_id) return;
    setSaving(true);
    const price = parsePriceToCents(form.price);
    try {
      if (editTarget) {
        await updateProduct(editTarget.id, {
          name: form.name,
          description: form.description || null,
          price,
          category_id: form.category_id,
          track_stock: form.track_stock,
          stock: form.stock,
          sort_order: form.sort_order,
          ingredients: form.ingredients,
          image_url: form.image_url,
          is_featured: form.is_featured,
        });
        toast.success("Produto atualizado!");
      } else {
        await addProduct(user.restaurant_id, {
          name: form.name,
          description: form.description || null,
          price,
          promotional_price: null,
          image_url: form.image_url,
          category_id: form.category_id,
          track_stock: form.track_stock,
          stock: form.stock,
          is_available: true,
          is_active: true,
          is_featured: form.is_featured,
          tags: [],
          ingredients: form.ingredients,
          preparation_time_minutes: null,
          sort_order: form.sort_order,
        });
        toast.success("Produto criado!");
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar. Verifique o Firestore.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(p: Product) {
    try {
      await updateProduct(p.id, { is_available: !p.is_available });
      toast.success(p.is_available ? "Produto indisponibilizado." : "Produto disponibilizado.");
    } catch (e) {
      toast.error("Erro ao atualizar disponibilidade.");
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Remover "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      toast.success("Produto removido.");
    } catch (e) {
      toast.error("Erro ao remover produto.");
    }
  }

  const getCategoryName = (id: string) =>
    categories.find((c) => c.category_id === id)?.name ?? "—";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="mt-1 text-sm text-zinc-400">Gerencie os itens do seu cardápio com fotos e ingredientes.</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Nenhum produto ainda. Clique em &quot;Novo Produto&quot; para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Foto</TableHead>
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Categoria</TableHead>
                <TableHead className="text-zinc-400">Preço</TableHead>
                <TableHead className="text-zinc-400">Ingredientes</TableHead>
                <TableHead className="text-zinc-400">Destaque</TableHead>
                <TableHead className="text-zinc-400">Disponível</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover border border-zinc-700" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <ChefHat className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-white">{p.name}</TableCell>
                  <TableCell className="text-zinc-400">{getCategoryName(p.category_id)}</TableCell>
                  <TableCell className="text-zinc-300">{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    {p.ingredients && p.ingredients.length > 0 ? (
                      <span className="text-xs text-zinc-400">{p.ingredients.length} itens</span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.is_featured && (
                      <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 px-2 py-0.5 rounded-full">
                        <Sparkles className="h-3 w-3 mr-1" /> Sim
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleAvailable(p)}
                      className="flex items-center gap-1 text-sm transition-colors"
                    >
                      {p.is_available ? (
                        <><ToggleRight className="h-5 w-5 text-green-400" /><span className="text-green-400">Sim</span></>
                      ) : (
                        <><ToggleLeft className="h-5 w-5 text-zinc-500" /><span className="text-zinc-500">Não</span></>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p)} className="h-8 w-8 text-zinc-400 hover:text-red-400">
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
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2">
            
            {/* Image Upload - Full Width */}
            <div className="col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-orange-400" /> Foto do Produto
              </Label>
              <ImageUploadField
                restaurantId={user?.restaurant_id ?? ""}
                currentUrl={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
            </div>

            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="prod-name">Nome *</Label>
              <Input id="prod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Picanha na Brasa 300g" className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600" />
            </div>

            {/* Description */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="prod-desc">Descrição</Label>
              <Input id="prod-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição do prato..." className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600" />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-price">Preço (R$) *</Label>
              <Input id="prod-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="49,90" className="border-zinc-700 bg-zinc-900 text-white" />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.category_id || ""} onValueChange={(v) => setForm({ ...form, category_id: String(v) })}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.category_id ?? c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ingredients - Full Width */}
            <div className="col-span-2 space-y-1.5">
              <Label className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-orange-400" /> Ingredientes Personalizáveis
              </Label>
              <p className="text-xs text-zinc-500">
                O cliente pode retirar estes ingredientes ao fazer o pedido. Digite e pressione <kbd className="rounded bg-zinc-800 px-1 text-zinc-400">Enter</kbd>.
              </p>
              <IngredientInput
                ingredients={form.ingredients}
                onChange={(v) => setForm({ ...form, ingredients: v })}
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-order">Ordem de Exibição</Label>
              <Input id="prod-order" type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="border-zinc-700 bg-zinc-900 text-white" />
            </div>

            {/* Stock & Featured */}
            <div className="space-y-4">
              <div className="space-y-1.5 pt-1">
                <Label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="h-5 w-5 rounded-lg border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500" 
                  />
                  <div>
                    <p className="font-bold text-orange-400 flex items-center gap-2">
                       <Sparkles className="h-4 w-4" /> Destaque da Casa
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Exibir no topo do cardápio</p>
                  </div>
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 px-1 cursor-pointer">
                  <input type="checkbox" checked={form.track_stock}
                    onChange={(e) => setForm({ ...form, track_stock: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-orange-500" />
                  <span className="text-sm font-medium">Rastrear estoque</span>
                </Label>
                {form.track_stock && (
                  <Input type="number" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    placeholder="Qtd. em estoque" className="border-zinc-700 bg-zinc-900 text-white" />
                )}
              </div>
            </div>

          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.category_id} className="bg-orange-500 text-white hover:bg-orange-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
