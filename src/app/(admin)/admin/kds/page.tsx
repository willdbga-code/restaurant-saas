"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKDSItems } from "@/hooks/useKDSItems";
import { useRestaurant } from "@/hooks/useRestaurant";
import { updateOrderItemStatus, approveItemCancellation, rejectItemCancellation } from "@/lib/firebase/orders";
import type { OrderItem, OrderItemStatus } from "@/lib/firebase/orders";
import { Loader2, ChefHat, Clock, Bell, CheckCheck, Utensils, Wifi, Printer, MapPin, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { ThermalReceipt } from "@/components/admin/kds/ThermalReceipt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
          <button 
             onClick={(e) => { e.stopPropagation(); handlePrint(); }}
             className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white transition-opacity md:opacity-0 group-hover:opacity-100"
             title="Imprimir Comanda"
           >
             <Printer className="h-3.5 w-3.5" />
           </button>
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
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Column header */}
      <div className={cn("flex items-center justify-between border-b px-4 py-3", col.headerBg)}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <span className="font-semibold text-white">{col.label}</span>
        </div>
        <span className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
          items.length > 0 ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
        )}>
          {items.length}
        </span>
      </div>

      {/* Items list */}
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
          items.map((item) => (
            <KDSCard
              key={item.id}
              item={item}
              nextStatus={col.nextStatus}
              nextLabel={col.nextLabel}
              nextBtnCls={col.nextBtnCls}
              tick={tick}
              restaurantName={restaurantName}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KDSPage() {
  const { user } = useAuth();
  const { pending, preparing, ready, loading, error } = useKDSItems(user?.restaurant_id);
  const { restaurant } = useRestaurant(user?.restaurant_id);
  const [printItem, setPrintItem] = useState<OrderItem | null>(null);

  // Listen for local print events
  useEffect(() => {
    const handler = (e: any) => {
      setPrintItem(e.detail);
    };
    window.addEventListener("print-kds-item", handler);
    return () => window.removeEventListener("print-kds-item", handler);
  }, []);

  // Tick a vleach minute to refresh elapsed times without re-subscribing Firestore
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

  const totalActive = pending.length + preparing.length + ready.length;

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
            <Wifi className="h-3.5 w-3.5" />
            <span>Ao vivo</span>
          </div>

          {/* Clock */}
          <div className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-300">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
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
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
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
    </div>
  );
}
