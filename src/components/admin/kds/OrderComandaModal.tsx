"use client";

import { useEffect, useRef } from "react";
import { OrderItem } from "@/lib/firebase/orders";
import { Printer, X, ChefHat, MapPin, Clock, Utensils } from "lucide-react";

interface Props {
  items: OrderItem[];
  restaurantName: string;
  onDismiss: () => void;
}

function fmt(cents: number) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Comanda completa de um pedido, exibida em tempo real no KDS.
 * Agrupa todos os itens de um mesmo order_id em uma visualização limpa.
 * A impressão usa o mesmo padrão térmico do ThermalReceipt.
 */
export function OrderComandaModal({ items, restaurantName, onDismiss }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  // Dados do pedido (todos os itens compartilham order_id, order_number, table_label)
  const firstItem = items[0];
  const orderNumber  = firstItem?.order_number  ?? 0;
  const tableLabel   = firstItem?.table_label   ?? "Balcão";
  const customerName = firstItem?.customer_name ?? null;
  const orderTotal   = items.reduce((acc, i) => acc + (i.total_price ?? 0), 0);

  const timeStr = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(now);

  function handlePrint() {
    const printContents = containerRef.current?.innerHTML;
    if (!printContents) return;

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comanda #${String(orderNumber).padStart(3, "0")}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: monospace; background: white; color: black; padding: 16px; width: 300px; }
            @page { margin: 0; size: 80mm auto; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
  }

  // Auto-dismiss after 30s se ninguém interagir
  useEffect(() => {
    const t = setTimeout(onDismiss, 30000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 shadow-[0_0_80px_rgba(249,115,22,0.25)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 bg-orange-500 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 leading-none">
                  Nova Comanda
                </p>
                <p className="text-xl font-black text-white leading-tight">
                  #{String(orderNumber).padStart(3, "0")}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 border-b border-white/5 bg-zinc-950/60 px-5 py-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 border border-orange-500/20">
              <MapPin className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-sm font-black text-orange-300">{tableLabel}</span>
            </div>
            {customerName && (
              <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 border border-purple-500/20">
                <span className="text-sm font-bold text-purple-300">{customerName}</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Items list */}
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {items.map((item, i) => (
              <div key={item.id ?? i} className="flex items-start gap-4 px-5 py-3.5">
                {/* Quantity badge */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-sm font-black text-orange-400">×{item.quantity}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white leading-tight truncate">{item.product_name}</p>
                  <p className="text-[11px] text-zinc-500 font-medium">{item.category_name ?? ""}</p>
                  {item.notes && (
                    <p className="mt-1 text-[11px] italic text-yellow-400 leading-snug line-clamp-2">
                      ✎ {item.notes}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-sm font-black text-white/70 tabular-nums">
                  {fmt(item.total_price ?? 0)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-white/10 bg-zinc-950/40 px-5 py-3">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Total</span>
            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
              {fmt(orderTotal)}
            </span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 p-5 pt-3">
            <button
              onClick={onDismiss}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-800 py-4 text-sm font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <Utensils className="h-4 w-4" />
              Entendido
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>

          {/* Hidden printable receipt */}
          <div className="hidden">
            <div ref={containerRef} style={{ fontFamily: "monospace", color: "black", background: "white", padding: "16px", width: "300px" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid black", paddingBottom: "8px", marginBottom: "8px" }}>
                <h1 style={{ fontSize: "18px", fontWeight: "900", textTransform: "uppercase" }}>{restaurantName}</h1>
                <p style={{ fontSize: "10px" }}>{timeStr}</p>
                <h2 style={{ fontSize: "28px", fontWeight: "900", marginTop: "4px" }}>
                  PEDIDO #{String(orderNumber).padStart(3, "0")}
                </h2>
              </div>

              <div style={{ padding: "8px 0", borderBottom: "2px solid black", marginBottom: "8px" }}>
                <p style={{ fontWeight: "900", fontSize: "18px" }}>MESA: {tableLabel}</p>
                {customerName && <p style={{ fontSize: "14px" }}>Cliente: {customerName}</p>}
              </div>

              {items.map((item, i) => (
                <div key={i} style={{ borderBottom: "1px dashed #ccc", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "20px", fontWeight: "900" }}>x{item.quantity}</span>
                    <span style={{ fontSize: "18px", fontWeight: "700", flex: 1, marginLeft: "8px", wordBreak: "break-word" }}>
                      {item.product_name}
                    </span>
                  </div>
                  {item.notes && (
                    <div style={{ border: "2px solid black", padding: "4px 6px", marginTop: "4px" }}>
                      <p style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase" }}>OBS:</p>
                      <p style={{ fontSize: "13px", fontWeight: "700", textDecoration: "underline" }}>{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ borderTop: "2px solid black", paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "900", fontSize: "16px" }}>TOTAL:</span>
                <span style={{ fontWeight: "900", fontSize: "16px" }}>{fmt(orderTotal)}</span>
              </div>

              <div style={{ height: "80px" }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
