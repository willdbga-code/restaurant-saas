"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTables } from "@/hooks/useTables";
import { onSnapshot, collection, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase/config";
import { playNotificationSound } from "@/lib/utils/sound";
import { Loader2, Users, ArrowRight, Plus, QrCode, X, Check, Bell, Lock, BarChart3, Banknote, ArrowUpRight, ArrowDownLeft, Wallet, History, Eye, Printer as PrinterIcon } from "lucide-react";
import { Order } from "@/lib/firebase/orders";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { orderBy, limit } from "firebase/firestore";



import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateTable } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Table } from "@/lib/firebase/firestore";

const STATUS_CFG: Record<Table["status"], { label: string; border: string; badge: string }> = {
  available: { label: "Livre", border: "border-green-500/40 hover:border-green-400 hover:bg-green-500/10", badge: "bg-green-500/20 text-green-400" },
  occupied:  { label: "Ocupada", border: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10", badge: "bg-orange-500/20 text-orange-400" },
  reserved:  { label: "Reservada", border: "border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-400" },
  cleaning:  { label: "Limpeza", border: "border-blue-500/40 hover:border-blue-400 hover:bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400" },
};

interface TableAlert {
  id: string;
  table_id: string;
  table_label: string;
  restaurant_id: string;
  status: "pending" | "resolved";
  created_at: any;
}

export default function PDVPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tables, loading } = useTables(user?.restaurant_id);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedTable, setScannedTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [activeOrders, setActiveOrders] = useState<Record<string, Order>>({});
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);




  // Scanner Logic
  useEffect(() => {
    let scanner: any = null;
    let timer: any = null;

    if (scanOpen) {
      timer = setTimeout(() => {
        const reader = document.getElementById("reader");
        if (!reader) return;

        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        scanner.render(
          (decodedText: string) => {
            try {
              const url = new URL(decodedText);
              const tableIdOrNum = url.searchParams.get("table");
              if (tableIdOrNum) {
                const table = tables.find((t: Table) => t.id === tableIdOrNum || t.number === Number(tableIdOrNum));
                if (table) {
                  setScannedTable(table);
                  scanner?.clear();
                } else {
                  toast.error("Mesa não encontrada.");
                }
              }
            } catch (e) {
              toast.error("QR Code inválido.");
            }
          },
          (err: any) => {}
        );
      }, 400); // Aguarda o Dialog abrir e o DOM renderizar
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [scanOpen, tables]);

  // Listener de Alertas de Mesa (Pedidos de Abertura)
  useEffect(() => {
    if (!user?.restaurant_id) return;

    const q = query(
      collection(db, "table_alerts"),
      where("restaurant_id", "==", user.restaurant_id),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      const newAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as TableAlert));
      
      // Som e Toast apenas para novos documentos adicionados em tempo real
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const latest = change.doc.data() as TableAlert;
          // Evita tocar no carregamento inicial (opcional, mas recomendado para não assustar)
          // Se quiser tocar sempre, remova a lógica de verificação de timestamp se necessário
          playNotificationSound();
          toast.info(`Pedido de abertura: ${latest.table_label}`, {
            description: "Um cliente está aguardando liberação na mesa.",
            duration: 8000,
          });
        }
      });

      setAlerts(newAlerts);
    });

    return () => unsub();
  }, [user?.restaurant_id]);

  // Listener do Total do Dia (Caixa)
  useEffect(() => {
    if (!user?.restaurant_id) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "orders"),
      where("restaurant_id", "==", user.restaurant_id),
      where("status", "==", "closed"),
      where("updated_at", ">=", Timestamp.fromDate(start))
    );

    const unsub = onSnapshot(q, (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().amount_paid || 0), 0);
      setTodayTotal(total);
    });

    return () => unsub();
  }, [user?.restaurant_id]);

  // Listener de Pedidos Ativos (para mostrar totais nas mesas)
  useEffect(() => {
    if (!user?.restaurant_id) return;

    const q = query(
      collection(db, "orders"),
      where("restaurant_id", "==", user.restaurant_id),
      where("status", "!=", "closed")
    );

    const unsub = onSnapshot(q, (snap) => {
      const ordersMap: Record<string, Order> = {};
      snap.docs.forEach(d => {
        const order = { id: d.id, ...d.data() } as Order;
        if (order.table_id) ordersMap[order.table_id] = order;
      });
      setActiveOrders(ordersMap);
    }, (err) => {
      console.error("Active orders error:", err);
    });

    return () => unsub();
  }, [user?.restaurant_id]);

  // Listener de Histórico (Últimos 15 pedidos fechados)
  useEffect(() => {
    if (!user?.restaurant_id) return;

    const q = query(
      collection(db, "orders"),
      where("restaurant_id", "==", user.restaurant_id),
      where("status", "==", "closed"),
      orderBy("updated_at", "desc"),
      limit(15)
    );

    const unsub = onSnapshot(q, (snap) => {
      setClosedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });

    return () => unsub();
  }, [user?.restaurant_id]);




  async function handleOpenTable(table: Table) {
    try {
      await updateTable(table.id, { status: "occupied" });
      
      // Limpa os alertas vinculados a essa mesa
      const tableAlerts = alerts.filter((a: TableAlert) => a.table_id === table.id);
      await Promise.all(tableAlerts.map((auth: TableAlert) => 
        updateDoc(doc(db, "table_alerts", auth.id), { status: "resolved" })
      ));

      toast.success(`Mesa ${table.number} aberta!`);
      setScanOpen(false);
      setScannedTable(null);
      router.push(`/admin/pdv/${table.id}`);
    } catch (e) {
      toast.error("Erro ao abrir mesa.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">PDV — Operação de Caixa</h1>
          <p className="mt-1 text-sm text-zinc-400">Gerencie mesas, pedidos e fechamentos em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Stats Summary */}
          <div className="hidden lg:flex flex-col items-end mr-4 px-4 border-r border-zinc-800">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendas hoje</span>
             <span className="text-xl font-black text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayTotal / 100)}
             </span>
          </div>


          <Button 
            onClick={() => setHistoryOpen(true)}
            variant="outline"
            className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white sm:flex-none h-10 px-4"
          >
            <History className="mr-2 h-4 w-4 text-blue-400" /> Histórico
          </Button>

          <Button 
            onClick={() => router.push("/admin/sales-report")}
            variant="outline"
            className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white sm:flex-none h-10 px-4"
          >
            <BarChart3 className="mr-2 h-4 w-4 text-emerald-500" /> Relatórios
          </Button>

          <Button 
            onClick={() => toast.info("Função de Sangria disponível no módulo de relatórios avançados.")}
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white sm:flex-none h-10 px-4"
          >
            <ArrowDownLeft className="mr-2 h-4 w-4 text-red-500" /> Sangria
          </Button>

          <Button 
            onClick={() => setScanOpen(true)}
            className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700 sm:flex-none h-10 px-4"
          >
            <QrCode className="mr-2 h-4 w-4 text-orange-400" /> Escanear Mesa
          </Button>
          
          <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 sm:flex-none h-10 px-4">
            <Plus className="mr-2 h-4 w-4" /> Comanda
          </Button>
        </div>
      </div>



      {/* Sessão de Urgência: Pendências de Abertura */}
      {alerts.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Solicitações de Abertura</h2>
            <span className="ml-auto text-[10px] font-black text-zinc-600 uppercase tabular-nums">{alerts.length} pendentes</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert: TableAlert) => {
              const tableObj = tables.find((t: Table) => t.id === alert.table_id);
              return (
                <div 
                  key={alert.id}
                  className="flex items-center justify-between p-4 rounded-3xl bg-red-500/5 border border-red-500/10 shadow-2xl transition-all hover:bg-red-500/10 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                       <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-white uppercase tracking-tight">{alert.table_label}</p>
                       <p className="text-[9px] text-red-400/60 font-black uppercase tracking-widest mt-0.5">Aguardando garçom</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => tableObj && handleOpenTable(tableObj)}
                    className="bg-white text-black h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 active:scale-95 transition-all shadow-xl"
                  >
                    Liberar
                  </button>
                </div>
              );
            })}
          </div>
          <div className="h-px bg-zinc-800/50 mt-10" />
        </div>
      )}

      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-24">
          <p className="text-zinc-500">Nenhuma mesa cadastrada.</p>
          <Button variant="link" className="mt-2 text-orange-400" onClick={() => router.push("/admin/tables")}>
            Cadastrar mesas →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table: Table) => {
            const cfg = STATUS_CFG[table.status];
            const order = activeOrders[table.id];

            return (
              <button
                key={table.id}
                onClick={() => router.push(`/admin/pdv/${table.id}`)}
                className={cn(
                  "group relative flex flex-col items-center justify-center rounded-3xl border-2 bg-zinc-900 p-6 text-center transition-all duration-300 shadow-xl",
                  cfg.border,
                  alerts.some((a: TableAlert) => a.table_id === table.id) && "ring-4 ring-orange-500 ring-offset-4 ring-offset-zinc-950 animate-pulse border-orange-500",
                  order && "border-orange-500/40 bg-orange-500/[0.02]"
                )}
              >
                {alerts.some((a: TableAlert) => a.table_id === table.id) && (
                   <div className="absolute -left-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] ring-4 ring-zinc-950">
                      <Bell className="h-5 w-5 text-white animate-bounce" />
                   </div>
                )}
                <span className={cn("absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", cfg.badge)}>
                  {cfg.label}
                </span>
                
                <span className="text-4xl font-black text-white group-hover:scale-110 transition-transform">{table.number}</span>
                <span className="mt-1 text-xs font-bold text-zinc-400 uppercase tracking-tighter">{table.label}</span>
                
                {order ? (
                  <div className="mt-4 flex flex-col items-center gap-0.5 animate-in fade-in zoom-in-95 duration-500">
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.1em]">Total</span>
                    <span className="text-lg font-black text-white tabular-nums">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total / 100)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    <Users className="h-3 w-3" />
                    <span>{table.capacity}p</span>
                  </div>
                )}

                <div className="absolute bottom-3 right-3 h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </button>
            );
          })}

        </div>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code da Mesa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {!scannedTable ? (
               <div id="reader" className="overflow-hidden rounded-xl border border-zinc-800" />
            ) : (
               <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95 duration-300">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orange-500 shadow-2xl shadow-orange-500/20">
                     <Users className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Mesa {scannedTable.number} — {scannedTable.label}</h3>
                  <p className="mt-2 text-zinc-400">Status atual: <span className="font-bold text-green-400 uppercase tracking-widest text-xs">Livre</span></p>
                  
                  <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                     <Button variant="ghost" onClick={() => setScannedTable(null)} className="text-zinc-500">
                        Voltar
                     </Button>
                     <Button onClick={() => handleOpenTable(scannedTable)} className="bg-orange-500 text-white font-black">
                        Abrir Mesa <Check className="ml-2 h-4 w-4" />
                     </Button>
                  </div>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Drawer */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md border-l-zinc-800 bg-zinc-950 p-0 text-white">
          <SheetHeader className="border-b border-zinc-800 p-6">
            <SheetTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
               <History className="h-5 w-5 text-blue-400" />
               Histórico Recente
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {closedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-2">
                 <History className="h-10 w-10 opacity-20" />
                 <p className="text-sm">Nenhum pedido fechado hoje.</p>
              </div>
            ) : (
              closedOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Pedido #{order.order_number}</span>
                      <span className="text-sm font-bold text-white leading-tight">{order.table_label || "Balcão"}</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase font-black">
                       Fechado
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-zinc-600">Total Pago</span>
                       <span className="text-lg font-black text-white">
                         {(order.amount_paid / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-9 w-9 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white"
                         onClick={() => router.push(`/admin/sales-report?order=${order.id}`)}
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="outline" 
                         size="icon"
                         className="h-9 w-9 rounded-xl border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-blue-500 hover:border-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/0 hover:shadow-blue-500/20"
                         onClick={() => {
                            // Link para o componente de impressão se necessário, 
                            // por agora redirecionar para ver e imprimir no relatório
                            router.push(`/admin/sales-report?order=${order.id}&print=true`);
                         }}
                       >
                         <PrinterIcon className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-[9px] text-zinc-600 uppercase font-bold tracking-widest">
                     Fechado em: {order.updated_at?.toDate().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
             <Button 
                onClick={() => router.push("/admin/sales-report")}
                className="w-full bg-zinc-800 text-white hover:bg-zinc-700 font-bold"
             >
                Ver Histórico Completo
             </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>

  );
}
