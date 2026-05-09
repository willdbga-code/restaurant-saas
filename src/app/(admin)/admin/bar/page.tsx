"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBarItems } from "@/hooks/useBarItems";
import { useRestaurant } from "@/hooks/useRestaurant";
import { playNotificationSound } from "@/lib/utils/sound";
import { updateOrderItemStatus, approveItemCancellation, rejectItemCancellation, forceCancelItem } from "@/lib/firebase/orders";
import type { OrderItem, OrderItemStatus } from "@/lib/firebase/orders";
import { Loader2, Clock, Bell, CheckCheck, Wifi, Printer, MapPin, XCircle, CheckCircle2, AlertCircle, Trash2, Download, GlassWater } from "lucide-react";
import { OrderComandaModal } from "@/components/admin/kds/OrderComandaModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function elapsed(ts: OrderItem["created_at"] | null): string {
  if (!ts) return "—";
  const sec = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function urgencyClass(ts: OrderItem["created_at"] | null): string {
  if (!ts) return "";
  const min = Math.floor((Date.now() - ts.toMillis()) / 60000);
  if (min >= 10) return "border-red-500/60 bg-red-500/5";
  if (min >= 5)  return "border-yellow-500/50 bg-yellow-500/5";
  return "border-zinc-700 bg-zinc-900";
}

function timerColor(ts: OrderItem["created_at"] | null): string {
  if (!ts) return "text-zinc-500";
  const min = Math.floor((Date.now() - ts.toMillis()) / 60000);
  if (min >= 10) return "text-red-400 font-bold";
  if (min >= 5)  return "text-yellow-400 font-semibold";
  return "text-zinc-400";
}

// ─── Column config (Bar theme: indigo) ────────────────────────────────────────
const COLUMNS: {
  status: OrderItemStatus;
  label: string;
  icon: React.ElementType;
  headerBg: string;
  nextStatus: OrderItemStatus;
  nextLabel: string;
  nextBtnCls: string;
}[] = [
  {
    status: "pending",
    label: "Novos Drinks",
    icon: Bell,
    headerBg: "bg-indigo-500/10 border-indigo-500/30",
    nextStatus: "preparing",
    nextLabel: "Iniciar Preparo",
    nextBtnCls: "bg-violet-500 hover:bg-violet-600 text-white",
  },
  {
    status: "preparing",
    label: "Preparando",
    icon: GlassWater,
    headerBg: "bg-violet-500/10 border-violet-500/30",
    nextStatus: "ready",
    nextLabel: "Marcar Pronto",
    nextBtnCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    status: "ready",
    label: "Prontos para Servir",
    icon: CheckCheck,
    headerBg: "bg-emerald-500/10 border-emerald-500/30",
    nextStatus: "delivered",
    nextLabel: "Confirmar Entrega",
    nextBtnCls: "bg-zinc-600 hover:bg-zinc-700 text-white",
  },
];

// ─── Item Card ────────────────────────────────────────────────────────────────
function BarCard({
  item,
  nextStatus,
  nextLabel,
  nextBtnCls,
  tick,
}: {
  item: OrderItem;
  nextStatus: OrderItemStatus;
  nextLabel: string;
  nextBtnCls: string;
  tick: number;
}) {
  const [loading, setLoading] = useState(false);
  void tick;

  async function advance() {
    setLoading(true);
    try {
      if (!item.restaurant_id) throw new Error("Missing restaurant_id");
      await updateOrderItemStatus(item.restaurant_id, item.id, nextStatus, item.order_id);
      if (nextStatus === "ready") toast.success(`"${item.product_name}" pronto!`);
    } catch {
      toast.error("Erro ao atualizar item.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceCancel() {
    if (!item.restaurant_id) return;
    if (!confirm("Cancelar este item? O valor será estornado.")) return;
    setLoading(true);
    try {
      await forceCancelItem(item.id, item.order_id, item.restaurant_id);
      toast.success("Item cancelado.");
    } catch {
      toast.error("Erro ao cancelar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOp(approve: boolean) {
    if (!item.restaurant_id) return;
    setLoading(true);
    try {
      if (approve) {
        await approveItemCancellation(item.id, item.order_id, item.restaurant_id);
        toast.success("Cancelamento aprovado.");
      } else {
        await rejectItemCancellation(item.id);
        toast.info("Cancelamento rejeitado.");
      }
    } catch {
      toast.error("Erro na operação.");
    } finally {
      setLoading(false);
    }
  }

  const isRequestingCancel = item.status === "request_cancel";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-300 relative group overflow-hidden",
        urgencyClass(item.created_at),
        isRequestingCancel && "border-red-500 bg-red-500/10 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
      )}
    >
      {isRequestingCancel && (
        <div className="absolute top-0 right-0 left-0 bg-red-600 py-1 flex items-center justify-center gap-1.5 z-10">
          <AlertCircle className="h-3 w-3 text-white" />
          <span className="text-[10px] font-black text-white uppercase tracking-wider">Solicitação de Cancelamento</span>
        </div>
      )}

      <div className={cn("mb-2 flex items-start justify-between gap-2", isRequestingCancel && "mt-4")}>
        <div className="flex-1">
          <p className="font-bold leading-tight text-white">{item.product_name}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className={cn("flex shrink-0 items-center gap-1 text-[10px]", timerColor(item.created_at))}>
            <Clock className="h-3 w-3" />
            <span>{elapsed(item.created_at)}</span>
          </div>
          <button
            onClick={handleForceCancel}
            disabled={loading}
            className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all md:opacity-0 group-hover:opacity-100"
            title="Cancelar Item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {item.table_label && (
          <span className={cn(
            "rounded-md px-2 py-0.5 text-xs font-bold",
            item.table_label === "Delivery" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-300"
          )}>
            {item.table_label === "Delivery" && <MapPin className="inline h-3 w-3 mr-1" />}
            {item.table_label}
          </span>
        )}
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
          #{item.order_number}
        </span>
        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
          ×{item.quantity}
        </span>
        {item.customer_name && (
          <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20">
            {item.customer_name.split(" ")[0]}
          </span>
        )}
      </div>

      {item.notes && (
        <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-xs italic text-yellow-300">"{item.notes}"</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {isRequestingCancel ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCancelOp(true)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Aceitar
            </button>
            <button
              onClick={() => handleCancelOp(false)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Negar
            </button>
          </div>
        ) : (
          <button
            onClick={advance}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
              nextBtnCls,
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Table Color Hash (Bar theme) ─────────────────────────────────────────────
const BAR_TABLE_COLORS = [
  { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-400", dot: "bg-indigo-400" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", dot: "bg-violet-400" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400" },
  { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", text: "text-fuchsia-400", dot: "bg-fuchsia-400" },
  { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-400", dot: "bg-teal-400" },
  { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-400", dot: "bg-sky-400" },
];

function getBarTableColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return BAR_TABLE_COLORS[Math.abs(hash) % BAR_TABLE_COLORS.length];
}

type BarTableGroupType = { table: string; orderNumber: number; customer: string | null; items: OrderItem[]; oldest: number };

function groupBarByTable(items: OrderItem[]): BarTableGroupType[] {
  const map = new Map<string, BarTableGroupType>();
  items.forEach(item => {
    const key = item.table_label || "Balcão";
    if (!map.has(key)) map.set(key, { table: key, orderNumber: item.order_number ?? 0, customer: item.customer_name || null, items: [], oldest: item.created_at?.toMillis() ?? Date.now() });
    const g = map.get(key)!;
    g.items.push(item);
    const ts = item.created_at?.toMillis() ?? Date.now();
    if (ts < g.oldest) { g.oldest = ts; g.orderNumber = item.order_number ?? g.orderNumber; }
    if (!g.customer && item.customer_name) g.customer = item.customer_name;
  });
  return Array.from(map.values()).sort((a, b) => a.oldest - b.oldest);
}

// ─── Bar Table Group Card ─────────────────────────────────────────────────────
function BarTableGroup({ group, nextStatus, nextLabel, nextBtnCls, tick }: {
  group: BarTableGroupType; nextStatus: OrderItemStatus; nextLabel: string; nextBtnCls: string; tick: number;
}) {
  const [batchLoading, setBatchLoading] = useState(false);
  const color = getBarTableColor(group.table);
  const oldestMin = Math.floor((Date.now() - group.oldest) / 60000);
  void tick;

  async function advanceAll() {
    setBatchLoading(true);
    try {
      await Promise.all(group.items.map(item => {
        if (!item.restaurant_id) return Promise.resolve();
        return updateOrderItemStatus(item.restaurant_id, item.id, nextStatus, item.order_id);
      }));
      if (nextStatus === "ready") toast.success(`${group.table}: drinks prontos! 🍸`);
    } catch { toast.error("Erro ao avançar itens."); }
    finally { setBatchLoading(false); }
  }

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-left-3",
      color.border,
      oldestMin >= 10 && "shadow-[0_0_25px_rgba(239,68,68,0.25)]"
    )}>
      <div className={cn("flex items-center justify-between px-4 py-3 backdrop-blur-sm", color.bg)}>
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full animate-pulse", color.dot)} />
          <span className={cn("font-black text-sm uppercase tracking-wide", color.text)}>🍸 {group.table}</span>
          <span className="text-zinc-500 text-xs font-mono">#{String(group.orderNumber).padStart(3,"0")}</span>
        </div>
        <div className="flex items-center gap-3">
          {group.customer && <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">👤 {group.customer.split(" ")[0]}</span>}
          <span className={cn("text-xs font-bold flex items-center gap-1", oldestMin >= 10 ? "text-red-400" : oldestMin >= 5 ? "text-yellow-400" : "text-zinc-400")}>
            <Clock className="h-3 w-3" />{oldestMin < 1 ? "agora" : `${oldestMin}m`}
          </span>
          <span className={cn("flex h-6 min-w-6 px-1 items-center justify-center rounded-full text-[10px] font-black", color.bg, color.text)}>{group.items.length}</span>
        </div>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {group.items.map(item => (
          <BarCard key={item.id} item={item} nextStatus={nextStatus} nextLabel={nextLabel} nextBtnCls={nextBtnCls} tick={tick} />
        ))}
      </div>
      {group.items.length > 1 && (
        <div className="px-3 py-2 bg-zinc-900/50 border-t border-zinc-800/50">
          <button onClick={advanceAll} disabled={batchLoading}
            className={cn("w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95", nextBtnCls, batchLoading && "opacity-60")}>
            {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {nextLabel} — Todos ({group.items.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function BarColumn({
  col,
  items,
  tick,
}: {
  col: (typeof COLUMNS)[number];
  items: OrderItem[];
  tick: number;
}) {
  const Icon = col.icon;
  const groups = groupBarByTable(items);

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className={cn("flex items-center justify-between border-b px-4 py-3", col.headerBg)}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <span className="font-semibold text-white">{col.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {groups.length > 0 && groups.length !== items.length && (
            <span className="text-[10px] text-zinc-500 font-bold">{groups.length} mesa(s)</span>
          )}
          <span className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            items.length > 0 ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
          )}>
            {items.length}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <p className="text-sm text-zinc-600">
              {col.status === "pending" ? "Nenhum drink novo" :
               col.status === "preparing" ? "Nada sendo preparado" :
               "Nenhum item pronto"}
            </p>
          </div>
        ) : (
          groups.map(group => (
            group.items.length === 1 ? (
              <BarCard key={group.items[0].id} item={group.items[0]} nextStatus={col.nextStatus} nextLabel={col.nextLabel} nextBtnCls={col.nextBtnCls} tick={tick} />
            ) : (
              <BarTableGroup key={group.table} group={group} nextStatus={col.nextStatus} nextLabel={col.nextLabel} nextBtnCls={col.nextBtnCls} tick={tick} />
            )
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BarPage() {
  const { user } = useAuth();
  const { restaurant } = useRestaurant(user?.restaurant_id);

  // Queue de comandas em tempo real
  const [comandaQueue, setComandaQueue] = useState<OrderItem[][]>([]);

  function dismissComanda() {
    setComandaQueue((q) => q.slice(1));
  }

  function handleNewItems(newItems: OrderItem[]) {
    const byOrder = new Map<string, OrderItem[]>();
    newItems.forEach((item) => {
      if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
      byOrder.get(item.order_id)!.push(item);
    });
    setComandaQueue((q) => [...q, ...Array.from(byOrder.values())]);
  }

  const { pending, preparing, ready, loading, error } = useBarItems(
    user?.restaurant_id,
    () => {
      playNotificationSound();
      toast.info("Novo drink no bar! 🍸", { duration: 4000 });
    },
    handleNewItems,
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [exporting, setExporting] = useState(false);

  async function handleExportDayWork() {
    if (!user?.restaurant_id) return;
    setExporting(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, "order_items"),
        where("restaurant_id", "==", user.restaurant_id),
        where("station", "==", "bar"),
        where("created_at", ">=", Timestamp.fromDate(startOfDay))
      );

      const snap = await getDocs(q);
      const barItems = snap.docs.map(d => d.data() as OrderItem);

      if (barItems.length === 0) {
        toast.info("Nenhum drink servido hoje.");
        return;
      }

      const STATUS_LABEL: Record<string, string> = {
        pending: "Aguardando", preparing: "Preparando", ready: "Pronto",
        delivered: "Entregue", cancelled: "Cancelado", request_cancel: "Solicita Cancelamento",
      };
      const fmtBRL = (c: number) => "R$ " + (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const cell = (v: string | number) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const sorted = [...barItems].sort((a, b) => {
        const tA = a.table_label ?? "zzz", tB = b.table_label ?? "zzz";
        if (tA !== tB) return tA.localeCompare(tB, "pt-BR");
        return (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0);
      });

      const lines: string[] = [];
      lines.push(`${cell("RELATÓRIO DO BAR")},${cell(restaurant?.name ?? "Restaurante")}`);
      lines.push(`${cell("Data:")},${cell(now.toLocaleString("pt-BR"))}`);
      lines.push(`${cell("Total de itens:")},${ cell(barItems.length)}`);
      lines.push("");
      lines.push(["Data/Hora", "Mesa", "Pedido Nº", "Cliente", "Drink", "Categoria", "Qtd", "Preço", "Total", "Obs.", "Status"].map(cell).join(","));

      let curTable = "", tableTotal = 0, tableQty = 0, grandTotal = 0, grandQty = 0;
      const flush = () => {
        if (!curTable) return;
        lines.push(["", `--- SUBTOTAL: ${curTable}`, "", "", "", "", tableQty, "", fmtBRL(tableTotal), "", ""].map(cell).join(","));
        lines.push("");
      };

      sorted.forEach(item => {
        const tk = item.table_label ?? "Balcão";
        if (tk !== curTable) { flush(); curTable = tk; tableTotal = 0; tableQty = 0; }
        tableTotal += item.total_price ?? 0; tableQty += item.quantity ?? 0;
        grandTotal += item.total_price ?? 0; grandQty += item.quantity ?? 0;
        lines.push([
          item.created_at?.toDate().toLocaleString("pt-BR") ?? "",
          tk, `#${String(item.order_number ?? 0).padStart(3, "0")}`,
          item.customer_name || "—", item.product_name, item.category_name || "—",
          item.quantity, fmtBRL(item.unit_price ?? 0), fmtBRL(item.total_price ?? 0),
          item.notes || "", STATUS_LABEL[item.status] ?? item.status,
        ].map(cell).join(","));
      });
      flush();
      lines.push(["", "=== TOTAL BAR", "", "", "", "", grandQty, "", fmtBRL(grandTotal), "", ""].map(cell).join(","));

      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bar-${now.toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Relatório do bar: ${barItems.length} itens.`);
    } catch (e) {
      console.error(e); toast.error("Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  }

  const totalActive = pending.length + preparing.length + ready.length;

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <GlassWater className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Bar — Drinks & Beverages</h1>
            <p className="text-xs text-zinc-500">Bar Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {totalActive > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400">{totalActive} drink(s) ativo(s)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <Wifi className="h-3.5 w-3.5" />
            <span>Sincronismo Ativo</span>
          </div>

          <div className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-300">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-1" />

          <button
            onClick={handleExportDayWork}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Baixar Relatório (CSV)
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-2 text-xs text-zinc-500">Verifique as credenciais do Firebase no .env.local</p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          {COLUMNS.map((col) => (
            <BarColumn
              key={col.status}
              col={col}
              items={
                col.status === "pending"   ? pending   :
                col.status === "preparing" ? preparing :
                ready
              }
              tick={tick}
            />
          ))}
        </div>
      )}

      {error?.includes("index") && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-2 text-xs text-yellow-400">
          ⚠️ Esta página requer índice composto no Firestore. Clique no link que apareceu no console do Firebase.
        </div>
      )}

      {/* Real-time Comanda Queue */}
      {comandaQueue.length > 0 && (
        <OrderComandaModal
          key={comandaQueue[0][0]?.order_id}
          items={comandaQueue[0]}
          restaurantName={restaurant?.name ?? "Bar"}
          onDismiss={dismissComanda}
        />
      )}
    </div>
  );
}
