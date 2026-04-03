"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTables } from "@/hooks/useTables";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useActiveOrder } from "@/hooks/useActiveOrder";
import { useOrderItems } from "@/hooks/useOrderItems";
import { useOrderPayments } from "@/hooks/useOrderPayments";
import {
  createOrder, addOrderItem, removeOrderItem,
  confirmOrder, closeOrder, updateOrderItemNotes,
  requestItemCancellation, forceCancelItem,
  PaymentMethod, Order, OrderItem,
} from "@/lib/firebase/orders";
import { updateTable } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Plus, Minus, Trash2, MessageSquare,
  Check, Loader2, ChefHat, Receipt, Clock,
  XCircle, AlertCircle, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE: Record<Order["status"], { label: string; cls: string }> = {
  pending:   { label: "Aguardando envio", cls: "bg-yellow-500/20 text-yellow-400" },
  confirmed: { label: "Na cozinha", cls: "bg-blue-500/20 text-blue-400" },
  preparing: { label: "Preparando", cls: "bg-orange-500/20 text-orange-400" },
  ready:     { label: "Pronto!", cls: "bg-green-500/20 text-green-400" },
  delivered: { label: "Entregue", cls: "bg-zinc-500/20 text-zinc-400" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/20 text-red-400" },
  closed:    { label: "Fechado", cls: "bg-zinc-700/50 text-zinc-500" },
};

const PAY_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "pix", label: "Pix" },
  { value: "voucher", label: "Voucher" },
];

export default function PDVTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { tables } = useTables(user?.restaurant_id);
  const { categories } = useCategories(user?.restaurant_id);
  const { products } = useProducts(user?.restaurant_id);
  const { order, loading: orderLoading } = useActiveOrder(user?.restaurant_id, tableId);
  const { items } = useOrderItems(user?.restaurant_id, order?.id);
  const { payments } = useOrderPayments(user?.restaurant_id, order?.id);

  const table = tables.find((t) => t.id === tableId);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ item: OrderItem; note: string } | null>(null);
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [busy, setBusy] = useState(false);

  const visibleProducts = products.filter(
    (p) => p.is_available && (!selectedCat || p.category_id === selectedCat)
  );

  const getCatName = (catId: string) =>
    categories.find((c) => c.category_id === catId || c.id === catId)?.name ?? "—";

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleStartOrder() {
    if (!user || !table) return;
    setBusy(true);
    try {
      await createOrder({
        restaurantId: user.restaurant_id,
        tableId: table.id,
        tableLabel: table.label,
        waiterUid: user.uid,
        waiterName: user.name,
      });
      await updateTable(table.id, { status: "occupied" });
      toast.success(`Pedido iniciado para ${table.label}!`);
    } catch { toast.error("Erro ao criar pedido."); }
    finally { setBusy(false); }
  }

  async function handleAddProduct(productId: string) {
    if (!order || !user) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const catName = getCatName(product.category_id ?? "");
    try {
      await addOrderItem({
        restaurantId: user.restaurant_id,
        orderId: order.id,
        orderNumber: order.order_number,
        tableLabel: table?.label ?? null,
        product,
        categoryName: catName,
        quantity: 1,
        notes: null,
      });
    } catch { toast.error("Erro ao adicionar item."); }
  }

  async function handleRemoveItem(item: OrderItem) {
    if (!order) return;
    try {
      await removeOrderItem(item.id, order.id, item.total_price, item.quantity);
    } catch { toast.error("Erro ao remover item."); }
  }

  async function handleConfirm() {
    if (!order) return;
    setBusy(true);
    try {
      await confirmOrder(order.id);
      toast.success("Pedido enviado para a cozinha!");
    } catch { toast.error("Erro ao confirmar pedido."); }
    finally { setBusy(false); }
  }

  async function handleClose() {
    if (!order || !table) return;
    setBusy(true);
    try {
      await closeOrder(order.id, payMethod);
      await updateTable(table.id, { status: "available", current_order_id: null });
      toast.success("Conta fechada!");
      setPayDialog(false);
      router.push("/admin/pdv");
    } catch { toast.error("Erro ao fechar conta."); }
    finally { setBusy(false); }
  }

  async function handleSaveNote() {
    if (!noteDialog) return;
    try {
      await updateOrderItemNotes(noteDialog.item.id, noteDialog.note || null);
      toast.success("Observação salva.");
      setNoteDialog(null);
    } catch { toast.error("Erro ao salvar observação."); }
  }

  async function handleRequestCancel(item: OrderItem) {
    try {
      await requestItemCancellation(item.id);
      toast.info("Solicitação enviada para a cozinha.");
    } catch { toast.error("Erro ao solicitar cancelamento."); }
  }

  async function handleForceCancel(item: OrderItem) {
    if (!confirm(`Gerente: Forçar cancelamento de "${item.product_name}"?`)) return;
    if (!user?.restaurant_id) return;
    try {
      await forceCancelItem(item.id, item.order_id, user.restaurant_id);
      toast.success("Item cancelado (Bypass Gerente).");
    } catch { toast.error("Erro ao forçar cancelamento."); }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <button onClick={() => router.push("/admin/pdv")} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="h-5 w-px bg-zinc-800" />
        <div>
          <span className="text-sm font-semibold text-white">{table?.label ?? "Mesa"}</span>
          <span className="ml-2 text-xs text-zinc-500">{table?.capacity} lugares</span>
        </div>
        {order && (
          <>
            <div className="h-5 w-px bg-zinc-800" />
            <span className="text-xs font-mono text-zinc-400">Pedido #{order.order_number}</span>
            <Badge className={cn("text-xs", STATUS_BADGE[order.status].cls)}>
              {STATUS_BADGE[order.status].label}
            </Badge>
          </>
        )}
        <div className="ml-auto flex gap-2">
          {order && order.status === "pending" && (
            <Button size="sm" onClick={handleConfirm} disabled={busy || items.length === 0} className="bg-blue-600 text-white hover:bg-blue-700">
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ChefHat className="mr-1 h-3 w-3" />}
              Enviar Cozinha
            </Button>
          )}
          {order && ["confirmed", "preparing", "ready", "delivered"].includes(order.status) && (
            <Button size="sm" onClick={() => setPayDialog(true)} className="bg-orange-500 text-white hover:bg-orange-600">
              <Receipt className="mr-1 h-3 w-3" /> Fechar Conta
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Menu Browser ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-4 py-3 scrollbar-none">
            <button
              onClick={() => setSelectedCat(null)}
              className={cn("shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors", !selectedCat ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.category_id ?? cat.id)}
                className={cn("shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors", selectedCat === (cat.category_id ?? cat.id) ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {!order ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-zinc-800 p-4">
                  <Clock className="h-8 w-8 text-zinc-500" />
                </div>
                <p className="text-zinc-400">Nenhum pedido aberto para esta mesa.</p>
                <Button onClick={handleStartOrder} disabled={busy} className="mt-4 bg-orange-500 text-white hover:bg-orange-600">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Iniciar Pedido
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product.id)}
                    className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left transition-all hover:border-orange-500/50 hover:bg-zinc-800"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 group-hover:bg-zinc-700">
                      <ChefHat className="h-5 w-5 text-zinc-500" />
                    </div>
                    <p className="text-sm font-medium leading-tight text-white line-clamp-2">{product.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{getCatName(product.category_id ?? "")}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-orange-400">{fmt(product.price)}</span>
                      <Plus className="h-4 w-4 text-zinc-500 group-hover:text-orange-400" />
                    </div>
                  </button>
                ))}
                {visibleProducts.length === 0 && (
                  <div className="col-span-full py-16 text-center text-sm text-zinc-500">Nenhum produto disponível nesta categoria.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Order Panel ── */}
        <aside className="flex w-80 flex-col border-l border-zinc-800 bg-zinc-900 xl:w-96">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Pedido atual</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-600">{order ? "Nenhum item adicionado." : "Inicie um pedido primeiro."}</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {items.map((item) => (
                  <li key={item.id} className={cn("flex items-start gap-3 px-4 py-3", item.status === "cancelled" && "opacity-40 grayscale")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-medium text-white", item.status === "cancelled" && "line-through")}>
                          {item.product_name}
                        </p>
                        {item.status === "request_cancel" && (
                          <Badge variant="outline" className="h-4 border-red-500/50 text-[8px] text-red-400 animate-pulse">REQ CANCEL</Badge>
                        )}
                        {item.status === "cancelled" && (
                          <Badge variant="outline" className="h-4 border-zinc-500 text-[8px] text-zinc-500 uppercase">Cancelado</Badge>
                        )}
                      </div>
                      {item.notes && <p className="mt-0.5 text-xs text-zinc-500 italic">"{item.notes}"</p>}
                      <p className="mt-1 text-xs text-zinc-400">{fmt(item.unit_price)} × {item.quantity}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-orange-400">{fmt(item.total_price)}</span>
                    
                    <div className="flex shrink-0 flex-col gap-1.5 ml-2">
                      {/* Ações baseadas em status e Role */}
                      
                      {/* 1. Item ainda não enviado (Pode apagar direto) */}
                      {item.status === "pending" && (
                        <button onClick={() => handleRemoveItem(item)} className="rounded p-0.5 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* 2. Item na cozinha / pronto (Hierarquia de Cancelamento) */}
                      {item.status !== "pending" && item.status !== "cancelled" && item.status !== "request_cancel" && (
                        <>
                          {user?.role === "admin" ? (
                            <button 
                              onClick={() => handleForceCancel(item)} 
                              className="rounded p-0.5 text-zinc-600 hover:text-red-500 transition-colors" 
                              title="Gerente: Cancelar Direto"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRequestCancel(item)} 
                              className="rounded p-0.5 text-zinc-600 hover:text-orange-400 transition-colors"
                              title="Solicitar Cancelamento à Cozinha"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Botão de Observação (Sempre disponível se não cancelado) */}
                      {item.status !== "cancelled" && (
                        <button onClick={() => setNoteDialog({ item, note: item.notes ?? "" })} className="rounded p-0.5 text-zinc-600 hover:text-blue-400 transition-colors">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payments breakdown */}
          {payments.length > 0 && (
            <div className="border-t border-zinc-800 bg-zinc-950/20 p-4">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3">Transações (Divisões)</p>
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-zinc-400 font-medium">Pagamento {p.method.toUpperCase()}</span>
                    </div>
                    <span className="text-white font-bold">{fmt(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {order && (
            <div className="border-t border-zinc-800 p-4 space-y-2">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white">
                <span>Total</span>
                <span className="text-white">{fmt(order.total)}</span>
              </div>
              {order.amount_paid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-500 font-bold">Já Pago</span>
                  <span className="text-green-500 font-bold">-{fmt(order.amount_paid)}</span>
                </div>
              )}
              {order.amount_paid > 0 && order.payment_status === "partial" && (
                <div className="flex justify-between text-lg font-black border-t border-zinc-800 pt-2 mt-2">
                  <span className="text-white">Saldo Restante</span>
                  <span className="text-orange-400">{fmt(order.total - order.amount_paid)}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {order.status === "pending" && (
                  <Button onClick={handleConfirm} disabled={busy || items.length === 0} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-sm">
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ChefHat className="mr-1 h-4 w-4" />}
                    Enviar Cozinha
                  </Button>
                )}
                {["confirmed", "preparing", "ready", "delivered"].includes(order.status) && (
                  <Button onClick={() => setPayDialog(true)} className="flex-1 bg-orange-500 text-white hover:bg-orange-600 text-sm">
                    <Receipt className="mr-1 h-4 w-4" /> Fechar Conta
                  </Button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Nota Dialog ── */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Observação — {noteDialog?.item.product_name}</DialogTitle>
          </DialogHeader>
          <Input
            value={noteDialog?.note ?? ""}
            onChange={(e) => setNoteDialog((n) => n ? { ...n, note: e.target.value } : n)}
            placeholder='Ex: "sem cebola, bem passado..."'
            className="border-zinc-700 bg-zinc-900 text-white"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteDialog(null)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleSaveNote} className="bg-orange-500 text-white hover:bg-orange-600">
              <Check className="mr-1 h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fechar Conta Dialog ── */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Fechar Conta — {table?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-sm text-zinc-400">{items.length} item(s)</p>
              <p className="text-3xl font-black text-orange-400">{fmt(order?.total ?? 0)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-zinc-400">Forma de pagamento</p>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                  {PAY_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayDialog(false)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleClose} disabled={busy} className="bg-green-600 text-white hover:bg-green-700">
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
