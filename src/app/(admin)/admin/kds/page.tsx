"use client";

import { useState, useEffect, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKDSItems } from "@/hooks/useKDSItems";
import { useRestaurant } from "@/hooks/useRestaurant";
import { playNotificationSound } from "@/lib/utils/sound";
import { updateOrderItemStatus, approveItemCancellation, rejectItemCancellation, forceCancelItem } from "@/lib/firebase/orders";
import type { OrderItem, OrderItemStatus } from "@/lib/firebase/orders";
import { Loader2, ChefHat, Clock, Bell, CheckCheck, Utensils, Wifi, Printer, MapPin, XCircle, CheckCircle2, AlertCircle, Trash2, Download, Columns3, LayoutList } from "lucide-react";
import { ThermalReceipt } from "@/components/admin/kds/ThermalReceipt";
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

// ─── Column config ────────────────────────────────────────────────────────────
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
    label: "Novos Pedidos",
    icon: Bell,
    headerBg: "bg-red-500/10 border-red-500/30",
    nextStatus: "preparing",
    nextLabel: "Iniciar Preparo",
    nextBtnCls: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  {
    status: "preparing",
    label: "Preparando",
    icon: Utensils,
    headerBg: "bg-orange-500/10 border-orange-500/30",
    nextStatus: "ready",
    nextLabel: "Marcar Pronto",
    nextBtnCls: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    status: "ready",
    label: "Prontos para Servir",
    icon: CheckCheck,
    headerBg: "bg-green-500/10 border-green-500/30",
    nextStatus: "delivered",
    nextLabel: "Confirmar Entrega",
    nextBtnCls: "bg-zinc-600 hover:bg-zinc-700 text-white",
  },
];

// ─── Item Card ────────────────────────────────────────────────────────────────
function KDSCard({
  item,
  nextStatus,
  nextLabel,
  nextBtnCls,
  tick,
  restaurantName,
}: {
  item: OrderItem;
  nextStatus: OrderItemStatus;
  nextLabel: string;
  nextBtnCls: string;
  tick: number;
  restaurantName: string | null;
}) {
  const [loading, setLoading] = useState(false);

  async function advance() {
    setLoading(true);
    try {
      if (!item.restaurant_id) throw new Error("Missing restaurant_id");
      await updateOrderItemStatus(item.restaurant_id, item.id, nextStatus, item.order_id);
      if (nextStatus === "ready") toast.success(`"${item.product_name}" está pronto!`);
    } catch {
      toast.error("Erro ao atualizar item.");
    } finally {
      setLoading(false);
    }
  }

  // tick is just used to force re-render for elapsed time
  void tick;

  function handlePrint() {
    const event = new CustomEvent("print-kds-item", { detail: item });
    window.dispatchEvent(event);
    // Timeout to ensure state updates before print dialog
    setTimeout(() => window.print(), 350);
  }

  const isRequestingCancel = item.status === "request_cancel";

  async function handleCancelOp(approve: boolean) {
    if (!item.restaurant_id) return;
    setLoading(true);
    try {
      if (approve) {
        await approveItemCancellation(item.id, item.order_id, item.restaurant_id);
        toast.success("Cancelamento aprovado.");
      } else {
        await rejectItemCancellation(item.id);
        toast.info("Cancelamento rejeitado pela cozinha.");
      }
    } catch {
      toast.error("Erro na operação de cancelamento.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceCancel() {
    if (!item.restaurant_id) return;
    if (!confirm("Tem certeza que deseja cancelar este item? O valor será estornado do subtotal da mesa.")) return;
    
    setLoading(true);
    try {
      await forceCancelItem(item.id, item.order_id, item.restaurant_id);
      toast.success("Item cancelado com sucesso pela cozinha.");
    } catch {
      toast.error("Erro ao cancelar item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-300 relative group overflow-hidden",
        urgencyClass(item.created_at),
        isRequestingCancel && "border-red-500 bg-red-500/10 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
      )}
    >
      {/* Cancellation Overlay Label */}
      {isRequestingCancel && (
        <div className="absolute top-0 right-0 left-0 bg-red-600 py-1 flex items-center justify-center gap-1.5 z-10">
          <AlertCircle className="h-3 w-3 text-white" />
          <span className="text-[10px] font-black text-white uppercase tracking-wider">Solicitação de Cancelamento</span>
        </div>
      )}

      {/* Header row */}
      <div className={cn("mb-2 flex items-start justify-between gap-2", isRequestingCancel && "mt-4")}>
        <div className="flex-1">
          <p className="font-bold leading-tight text-white">{item.product_name}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className={cn("flex shrink-0 items-center gap-1 text-[10px]", timerColor(item.created_at))}>
            <Clock className="h-3 w-3" />
            <span>{elapsed(item.created_at)}</span>
          </div>
          <div className="flex gap-2 items-center">
            <button 
               onClick={(e) => { e.stopPropagation(); handlePrint(); }}
               className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white transition-opacity md:opacity-0 group-hover:opacity-100"
               title="Imprimir Comanda"
             >
               <Printer className="h-3.5 w-3.5" />
            </button>
            <button 
               onClick={(e) => { e.stopPropagation(); handleForceCancel(); }}
               disabled={loading}
               className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all md:opacity-0 group-hover:opacity-100"
               title="Cancelar Item Diretamente"
             >
               <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Meta badges */}
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
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-bold text-orange-400">
          ×{item.quantity}
        </span>
        {item.customer_name && (
          <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20">
            {item.customer_name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-xs italic text-yellow-300">"{item.notes}"</p>
        </div>
      )}

      {/* Action buttons */}
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

// ─── Table Color Hash ─────────────────────────────────────────────────────────
const TABLE_COLORS = [
  { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-400" },
  { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-400" },
  { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-400", dot: "bg-pink-400" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-400" },
];

function getTableColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return TABLE_COLORS[Math.abs(hash) % TABLE_COLORS.length];
}

type TableGroup = { table: string; orderNumber: number; customer: string | null; items: OrderItem[]; oldest: number };

function groupByTable(items: OrderItem[]): TableGroup[] {
  const map = new Map<string, TableGroup>();
  items.forEach((item) => {
    const key = item.table_label || "Balcão";
    if (!map.has(key)) {
      map.set(key, { table: key, orderNumber: item.order_number ?? 0, customer: item.customer_name || null, items: [], oldest: item.created_at?.toMillis() ?? Date.now() });
    }
    const g = map.get(key)!;
    g.items.push(item);
    const ts = item.created_at?.toMillis() ?? Date.now();
    if (ts < g.oldest) { g.oldest = ts; g.orderNumber = item.order_number ?? g.orderNumber; }
    if (!g.customer && item.customer_name) g.customer = item.customer_name;
  });
  return Array.from(map.values()).sort((a, b) => a.oldest - b.oldest);
}

// ─── Table Group Card ─────────────────────────────────────────────────────────
function KDSTableGroup({
  group, nextStatus, nextLabel, nextBtnCls, tick, restaurantName,
}: {
  group: TableGroup; nextStatus: OrderItemStatus; nextLabel: string; nextBtnCls: string; tick: number; restaurantName: string | null;
}) {
  const [batchLoading, setBatchLoading] = useState(false);
  const color = getTableColor(group.table);
  const oldestMin = Math.floor((Date.now() - group.oldest) / 60000);
  void tick;

  async function advanceAll() {
    setBatchLoading(true);
    try {
      await Promise.all(group.items.map(item => {
        if (!item.restaurant_id) return Promise.resolve();
        return updateOrderItemStatus(item.restaurant_id, item.id, nextStatus, item.order_id);
      }));
      if (nextStatus === "ready") toast.success(`${group.table}: todos prontos! ✅`);
    } catch { toast.error("Erro ao avançar itens."); }
    finally { setBatchLoading(false); }
  }

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-left-3",
      color.border,
      oldestMin >= 10 && "shadow-[0_0_25px_rgba(239,68,68,0.25)]"
    )}>
      {/* Group Header */}
      <div className={cn("flex items-center justify-between px-4 py-3 backdrop-blur-sm", color.bg)}>
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full animate-pulse", color.dot)} />
          <div>
            <span className={cn("font-black text-sm uppercase tracking-wide", color.text)}>🪑 {group.table}</span>
            <span className="ml-2 text-zinc-500 text-xs font-mono">#{String(group.orderNumber).padStart(3,"0")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {group.customer && (
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
              👤 {group.customer.split(" ")[0]}
            </span>
          )}
          <span className={cn("text-xs font-bold flex items-center gap-1",
            oldestMin >= 10 ? "text-red-400" : oldestMin >= 5 ? "text-yellow-400" : "text-zinc-400"
          )}>
            <Clock className="h-3 w-3" />
            {oldestMin < 1 ? "agora" : `${oldestMin}m`}
          </span>
          <span className={cn("flex h-6 min-w-6 px-1 items-center justify-center rounded-full text-[10px] font-black", color.bg, color.text)}>
            {group.items.length}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-zinc-800/50">
        {group.items.map(item => (
          <KDSCard key={item.id} item={item} nextStatus={nextStatus} nextLabel={nextLabel} nextBtnCls={nextBtnCls} tick={tick} restaurantName={restaurantName} />
        ))}
      </div>

      {/* Batch Action */}
      {group.items.length > 1 && (
        <div className="px-3 py-2 bg-zinc-900/50 border-t border-zinc-800/50">
          <button
            onClick={advanceAll}
            disabled={batchLoading}
            className={cn("w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95", nextBtnCls, batchLoading && "opacity-60")}
          >
            {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {nextLabel} — Todos ({group.items.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KDSColumn({
  col,
  items,
  tick,
  restaurantName,
}: {
  col: (typeof COLUMNS)[number];
  items: OrderItem[];
  tick: number;
  restaurantName: string | null;
}) {
  const Icon = col.icon;
  const groups = groupByTable(items);

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Column header */}
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

      {/* Items list — grouped by table */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <p className="text-sm text-zinc-600">
              {col.status === "pending" ? "Nenhum pedido novo" :
               col.status === "preparing" ? "Nada sendo preparado" :
               "Nenhum item pronto"}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            group.items.length === 1 ? (
              <KDSCard
                key={group.items[0].id}
                item={group.items[0]}
                nextStatus={col.nextStatus}
                nextLabel={col.nextLabel}
                nextBtnCls={col.nextBtnCls}
                tick={tick}
                restaurantName={restaurantName}
              />
            ) : (
              <KDSTableGroup
                key={group.table}
                group={group}
                nextStatus={col.nextStatus}
                nextLabel={col.nextLabel}
                nextBtnCls={col.nextBtnCls}
                tick={tick}
                restaurantName={restaurantName}
              />
            )
          ))
        )}
      </div>
    </div>
  );
}

// ─── Clock (isolated to prevent full-page re-renders every second) ────────────
const KDSClock = memo(function KDSClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-300">
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KDSPage() {
  const { user } = useAuth();
  const { pending, preparing, ready, loading, error } = useKDSItems(
    user?.restaurant_id,
    () => {
      playNotificationSound();
      toast.info("Nova comanda na cozinha! 🔔", { duration: 4000 });
    },
    handleNewItems,
  );
  const { restaurant } = useRestaurant(user?.restaurant_id);
  const [printItem, setPrintItem] = useState<OrderItem | null>(null);

  // Queue of incoming orders — each entry is a batch of items from the same order
  const [comandaQueue, setComandaQueue] = useState<OrderItem[][]>([]);

  function dismissComanda() {
    setComandaQueue((q) => q.slice(1));
  }

  function handleNewItems(newItems: OrderItem[]) {
    // Group the batch by order_id (usually all the same, but safe to guard)
    const byOrder = new Map<string, OrderItem[]>();
    newItems.forEach((item) => {
      const oid = item.order_id;
      if (!byOrder.has(oid)) byOrder.set(oid, []);
      byOrder.get(oid)!.push(item);
    });
    const batches = Array.from(byOrder.values());
    setComandaQueue((q) => [...q, ...batches]);
  }

  // Listen for local print events
  useEffect(() => {
    const handler = (e: any) => {
      setPrintItem(e.detail);
    };
    window.addEventListener("print-kds-item", handler);
    return () => window.removeEventListener("print-kds-item", handler);
  }, []);

  // Tick each 30s to refresh elapsed times without re-subscribing Firestore
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
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
        where("created_at", ">=", Timestamp.fromDate(startOfDay))
      );

      const snap = await getDocs(q);
      const kdsItems = snap.docs.map(d => d.data() as OrderItem);

      if (kdsItems.length === 0) {
        toast.info("Nenhum item processado hoje.");
        return;
      }

      // ─── Helpers ─────────────────────────────────────────────────────
      const STATUS_LABEL: Record<string, string> = {
        pending: "Aguardando",
        preparing: "Preparando",
        ready: "Pronto",
        delivered: "Entregue",
        cancelled: "Cancelado",
        request_cancel: "Solicita Cancelamento",
      };

      const fmtBRL = (cents: number) =>
        "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const fmtDateTime = (ts: OrderItem["created_at"] | undefined) =>
        ts?.toDate().toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        }) ?? "";

      // Escape a value for safe CSV: wrap in quotes if it contains comma, quote, or newline
      const cell = (val: string | number) => {
        const s = String(val ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const nowDate = new Date();
      const restaurantName = restaurant?.name ?? "Restaurante";
      const exportDate = nowDate.toLocaleString("pt-BR");

      // ─── Sort by table then by time ───────────────────────────────────
      const sorted = [...kdsItems].sort((a, b) => {
        const tA = a.table_label ?? "zzz";
        const tB = b.table_label ?? "zzz";
        if (tA !== tB) return tA.localeCompare(tB, "pt-BR");
        return (a.created_at?.toMillis() ?? 0) - (b.created_at?.toMillis() ?? 0);
      });

      // ─── Build lines ──────────────────────────────────────────────────
      const lines: string[] = [];

      // Metadata block
      lines.push(`${cell("RELATÓRIO DA COZINHA")},${cell(restaurantName)}`);
      lines.push(`${cell("Data de exportação:")},${cell(exportDate)}`);
      lines.push(`${cell("Total de itens:")},${ cell(kdsItems.length)}`);
      lines.push(""); // blank line

      // Column headers
      lines.push([
        "Data/Hora", "Mesa", "Pedido Nº", "Cliente",
        "Produto", "Categoria", "Qtd", "Preço Unit.", "Total (R$)", "Obs.", "Status",
      ].map(cell).join(","));

      // Data rows with per-table subtotals
      let currentTable = "";
      let tableSubtotal = 0;
      let tableQty = 0;
      let grandTotal = 0;
      let grandQty = 0;

      const flushTable = () => {
        if (!currentTable) return;
        lines.push(
          ["", `--- SUBTOTAL: ${currentTable}`, "", "", "", "",
            tableQty, "", fmtBRL(tableSubtotal), "", ""].map(cell).join(",")
        );
        lines.push("");
      };

      sorted.forEach((item) => {
        const tableKey = item.table_label ?? "Balcão";

        if (tableKey !== currentTable) {
          flushTable();
          currentTable = tableKey;
          tableSubtotal = 0;
          tableQty = 0;
        }

        tableSubtotal += item.total_price ?? 0;
        tableQty      += item.quantity   ?? 0;
        grandTotal    += item.total_price ?? 0;
        grandQty      += item.quantity   ?? 0;

        lines.push([
          fmtDateTime(item.created_at),
          tableKey,
          `#${String(item.order_number ?? 0).padStart(3, "0")}`,
          item.customer_name || "—",
          item.product_name,
          item.category_name || "—",
          item.quantity,
          fmtBRL(item.unit_price ?? 0),
          fmtBRL(item.total_price ?? 0),
          item.notes || "",
          STATUS_LABEL[item.status] ?? item.status,
        ].map(cell).join(","));
      });

      flushTable();

      // Grand total row
      lines.push(
        ["", "=== TOTAL GERAL", "", "", "", "",
          grandQty, "", fmtBRL(grandTotal), "", ""].map(cell).join(",")
      );

      // ─── Download with BOM for Excel/Sheets encoding ──────────────────
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `cozinha-${nowDate.toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Relatório gerado: ${kdsItems.length} itens exportados.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar relatório.");
    } finally {
      setExporting(false);
    }
  }

  const totalActive = pending.length + preparing.length + ready.length;
  const [viewMode, setViewMode] = useState<"columns" | "tabs">("columns");
  const [activeTab, setActiveTab] = useState<"pending" | "preparing" | "ready">("pending");

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">KDS — Cozinha</h1>
            <p className="text-xs text-zinc-500">Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active item count */}
          {totalActive > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              <span className="text-xs font-semibold text-orange-400">{totalActive} item(s) ativo(s)</span>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <Wifi className="h-3.5 w-3.5" />
            <span>Sincronismo Ativo</span>
          </div>

          {/* Clock (isolated to avoid full-page re-renders) */}
          <KDSClock />

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === "columns" ? "tabs" : "columns")}
            className="hidden lg:flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            title={viewMode === "columns" ? "Modo Tabs" : "Modo Colunas"}
          >
            {viewMode === "columns" ? <LayoutList className="h-3.5 w-3.5" /> : <Columns3 className="h-3.5 w-3.5" />}
            {viewMode === "columns" ? "Tabs" : "Colunas"}
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1" />

          {/* Export Report CSV */}
          <button
            onClick={handleExportDayWork}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Baixar Relatório (CSV)</span>
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-2 text-xs text-zinc-500">Verifique as credenciais do Firebase no .env.local</p>
        </div>
      ) : (
        <>
          {/* Desktop: side-by-side columns */}
          <div className={cn("flex-1 gap-4 overflow-hidden p-4", viewMode === "columns" ? "hidden lg:flex" : "hidden")}>
            {COLUMNS.map((col) => (
              <KDSColumn
                key={col.status}
                col={col}
                items={
                  col.status === "pending"   ? pending   :
                  col.status === "preparing" ? preparing :
                  ready
                }
                tick={tick}
                restaurantName={restaurant?.name || null}
              />
            ))}
          </div>

          {/* Tablet/Mobile: tab-based view */}
          <div className={cn("flex-1 flex flex-col overflow-hidden", viewMode === "tabs" ? "flex" : "flex lg:hidden")}>
            {/* Tab bar */}
            <div className="flex border-b border-zinc-800 px-4 pt-2">
              {COLUMNS.map((col) => {
                const count = col.status === "pending" ? pending.length : col.status === "preparing" ? preparing.length : ready.length;
                const Icon = col.icon;
                return (
                  <button
                    key={col.status}
                    onClick={() => setActiveTab(col.status as typeof activeTab)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2",
                      activeTab === col.status
                        ? "border-orange-500 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{col.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        "ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        activeTab === col.status ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const tabItems = activeTab === "pending" ? pending : activeTab === "preparing" ? preparing : ready;
                  const col = COLUMNS.find(c => c.status === activeTab)!;
                  const groups = groupByTable(tabItems);
                  
                  if (tabItems.length === 0) return (
                    <div className="col-span-full flex items-center justify-center py-20">
                      <p className="text-sm text-zinc-600">
                        {activeTab === "pending" ? "Nenhum pedido novo" :
                         activeTab === "preparing" ? "Nada sendo preparado" :
                         "Nenhum item pronto"}
                      </p>
                    </div>
                  );

                  return groups.map(group => (
                    group.items.length === 1 ? (
                      <KDSCard key={group.items[0].id} item={group.items[0]} nextStatus={col.nextStatus} nextLabel={col.nextLabel} nextBtnCls={col.nextBtnCls} tick={tick} restaurantName={restaurant?.name || null} />
                    ) : (
                      <KDSTableGroup key={group.table} group={group} nextStatus={col.nextStatus} nextLabel={col.nextLabel} nextBtnCls={col.nextBtnCls} tick={tick} restaurantName={restaurant?.name || null} />
                    )
                  ));
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Footer — Composite Index Reminder ── */}
      {error?.includes("index") && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-2 text-xs text-yellow-400">
          ⚠️ Esta página requer um índice composto no Firestore. Clique no link que apareceu no console do Firebase para criá-lo automaticamente.
        </div>
      )}

      {/* Hidden Thermal Receipt for Printing */}
      <div className="hidden print:block">
        {printItem && <ThermalReceipt item={printItem} restaurantName={restaurant?.name || "Cozinha"} />}
      </div>

      {/* Real-time Comanda Queue */}
      {comandaQueue.length > 0 && (
        <OrderComandaModal
          key={comandaQueue[0][0]?.order_id}
          items={comandaQueue[0]}
          restaurantName={restaurant?.name ?? "Cozinha"}
          onDismiss={dismissComanda}
        />
      )}
    </div>
  );
}
