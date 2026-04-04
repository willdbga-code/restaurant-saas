"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDocs } from "firebase/firestore";
import { Order, OrderItem, OrderPayment, PaymentMethod } from "@/lib/firebase/orders";
import { 
  BarChart3, Calendar, Search, Receipt, 
  ChevronRight, Printer, CreditCard, Banknote, 
  Wallet, Loader2, Filter, AlertCircle,
  Pizza, Clock, MapPin, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABELS: Record<Order["status"], { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-yellow-500/10 text-yellow-500" },
  confirmed: { label: "Cozinha", cls: "bg-blue-500/10 text-blue-500" },
  preparing: { label: "Preparando", cls: "bg-orange-500/10 text-orange-500" },
  ready: { label: "Pronto", cls: "bg-green-500/10 text-green-500" },
  delivered: { label: "Entregue", cls: "bg-zinc-500/10 text-zinc-500" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-500" },
  closed: { label: "Fechado", cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" },
};

const PAY_LABELS: Record<PaymentMethod, { label: string, icon: any }> = {
  cash: { label: "Dinheiro", icon: Banknote },
  credit_card: { label: "Cartão de Crédito", icon: CreditCard },
  debit_card: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "Pix", icon: Wallet },
  voucher: { label: "Voucher", icon: Receipt },
};

export default function SalesReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderPayments, setOrderPayments] = useState<OrderPayment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [wifiInfo, setWifiInfo] = useState("");

  useEffect(() => {
    if (!user?.restaurant_id) return;

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    setLoading(true);
    const q = query(
      collection(db, "orders"),
      where("restaurant_id", "==", user.restaurant_id),
      where("created_at", ">=", Timestamp.fromDate(start)),
      where("created_at", "<=", Timestamp.fromDate(end)),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Erro ao carregar pedidos.");
      setLoading(false);
    });

    return () => unsub();
  }, [user?.restaurant_id, selectedDate]);

  async function handleViewDetails(order: Order) {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      // Fetch items
      const itemsSnap = await getDocs(query(
        collection(db, "order_items"),
        where("order_id", "==", order.id)
      ));
      setOrderItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderItem)));

      // Fetch payments
      const paymentsSnap = await getDocs(query(
        collection(db, "order_payments"),
        where("order_id", "==", order.id)
      ));
      setOrderPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderPayment)));
      
      // Auto-set feedback URL to restaurant menu slug if not set
      if (!feedbackUrl && user?.restaurant_id) {
        // Try to get restaurant slug for QR code
        const restDoc = await getDocs(query(collection(db, "restaurants"), where("restaurant_id", "==", user.restaurant_id)));
        if (!restDoc.empty) {
          const slug = restDoc.docs[0].data().slug;
          setFeedbackUrl(`${window.location.origin}/menu/${slug}?table=${order.table_id || "balcao"}`);
        }
      }
    } catch (err) {
      toast.error("Erro ao carregar detalhes.");
    } finally {
      setDetailLoading(false);
    }
  }

  // --- Printing ---
  function handlePrint() {
    if (!selectedOrder) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const serviceFee = includeServiceCharge ? selectedOrder.total * 0.1 : 0;
    const finalTotal = selectedOrder.total + serviceFee;

    const itemsHtml = orderItems.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <span>${item.quantity}x ${item.product_name}</span>
        <span>${fmt(item.total_price)}</span>
      </div>
    `).join("");

    const paymentsHtml = orderPayments.map(p => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
        <span>${PAY_LABELS[p.method]?.label || p.method}</span>
        <span>${fmt(p.amount)}</span>
      </div>
    `).join("");

    const splitHtml = [2, 3, 4, 5].map(n => `
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Se dividir p/ ${n}:</span>
        <span>${fmt(finalTotal / n)}</span>
      </div>
    `).join("");

    const qrCodeUrl = feedbackUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(feedbackUrl)}` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo #${selectedOrder.order_number}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 72mm; 
              padding: 5mm; 
              margin: 0; 
              color: #000; 
              background: #fff;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .section { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            h2, h3 { margin: 3px 0; font-size: 16px; }
            p { margin: 2px 0; font-size: 12px; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .qr-container { margin-top: 10px; display: flex; flex-direction: column; align-items: center; }
            .qr-image { width: 100px; height: 100px; margin-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h3>CUPOM DE VENDA</h3>
            <p>Pedido #${selectedOrder.order_number}</p>
            <p>${selectedOrder.created_at?.toDate().toLocaleString("pt-BR")}</p>
            <p>Mesa: ${selectedOrder.table_label || "Balcão"}</p>
          </div>

          <div class="section">
            <p class="bold">ITENS:</p>
            ${itemsHtml}
          </div>

          <div class="section">
            <div class="flex"><span>Subtotal:</span><span>${fmt(selectedOrder.subtotal)}</span></div>
            ${includeServiceCharge ? `<div class="flex"><span>Taxa de Serviço (10%):</span><span>${fmt(serviceFee)}</span></div>` : ""}
            <div class="flex"><span>Descontos:</span><span>${fmt(selectedOrder.discount)}</span></div>
            <div class="flex bold" style="font-size: 14px; margin-top: 4px; border-top: 1px solid #000; padding-top: 2px;">
              <span>TOTAL:</span><span>${fmt(finalTotal)}</span>
            </div>
          </div>

          <div class="section">
            <p class="bold">DIVISÃO:</p>
            ${splitHtml}
          </div>

          ${orderPayments.length > 0 ? `
          <div class="section">
            <p class="bold">PAGAMENTOS:</p>
            ${paymentsHtml}
          </div>` : ""}

          ${wifiInfo ? `
          <div class="section" style="text-align: center;">
            <p class="bold">WIFI: ${wifiInfo}</p>
          </div>` : ""}

          <div class="footer">
            ${feedbackUrl ? `
            <div class="qr-container">
              <p class="bold" style="font-size: 9px; uppercase">Avalie sua experiência</p>
              <img src="${qrCodeUrl}" class="qr-image" />
            </div>` : ""}
            <p style="margin-top: 10px;">Obrigado pela preferência!</p>
            <p>RestaurantOS SaaS</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- Calculations ---
  const filteredOrders = orders.filter(o => 
    o.order_number.toString().includes(searchTerm) || 
    o.table_label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = orders.reduce((acc, o) => {
    acc.total += o.amount_paid || 0;
    acc.count += 1;
    // Soma por método de pagamento baseada nas transações reais (Payments collection)
    return acc;
  }, { total: 0, count: 0 });

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-950 min-h-screen text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            Relatório de Vendas
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Acompanhe o faturamento e histórico de pedidos do dia.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white w-48"
            />
          </div>
          <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-white gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Total Faturado</p>
          <p className="text-3xl font-black text-white">{fmt(stats.total)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
            <Check className="h-3 w-3" /> {stats.count} pedidos realizados
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Pedidos em Aberto</p>
          <p className="text-3xl font-black text-white">{orders.filter(o => o.status !== "closed" && o.status !== "cancelled").length}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Consumo Total</p>
          <p className="text-3xl font-black text-white">{fmt(orders.reduce((acc, o) => acc + o.total, 0))}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Pedidos do Período</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por mesa ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-zinc-600 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
              <p>Carregando dados das vendas...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-zinc-600 gap-4">
              <AlertCircle className="h-12 w-12 opacity-20" />
              <p>Nenhum pedido encontrado para o período.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Mesa</th>
                  <th className="px-6 py-4">Pedido #</th>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Pago</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <Badge className={cn("text-[10px] uppercase font-black px-2 py-0.5 border-none", STATUS_LABELS[order.status].cls)}>
                        {STATUS_LABELS[order.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">{order.table_label || "Balcão"}</td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-400">#{order.order_number}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {order.created_at?.toDate().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-sm font-bold",
                        order.payment_status === "paid" ? "text-emerald-400" : "text-orange-400"
                      )}>
                        {fmt(order.amount_paid)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-white">{fmt(order.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleViewDetails(order)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-xl rounded-[2.5rem] scrollbar-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Receipt className="h-6 w-6 text-orange-500" />
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-zinc-500">Carregando detalhes...</p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Receipt Options */}
              <div className="bg-zinc-900 border border-orange-500/20 p-5 rounded-[2rem] space-y-4">
                <p className="text-[10px] font-black uppercase text-orange-500 tracking-[0.2em] px-1">Opções de Impressão</p>
                
                <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">Taxa de Serviço (10%)</p>
                    <p className="text-xs text-zinc-500">Adiciona sugestão de serviço ao cupom.</p>
                  </div>
                  <button 
                    onClick={() => setIncludeServiceCharge(!includeServiceCharge)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      includeServiceCharge ? "bg-orange-500" : "bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      includeServiceCharge ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Link de Avaliação (QR)</p>
                    <Input 
                      placeholder="URL para feedback..."
                      value={feedbackUrl}
                      onChange={(e) => setFeedbackUrl(e.target.value)}
                      className="bg-zinc-950 border-white/5 rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Info Wi-Fi (Opcional)</p>
                    <Input 
                      placeholder="Ex: Senha: 12345"
                      value={wifiInfo}
                      onChange={(e) => setWifiInfo(e.target.value)}
                      className="bg-zinc-950 border-white/5 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-3xl border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Origem</p>
                  <p className="text-lg font-bold">{selectedOrder?.table_label || "Balcão"}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-3xl border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-1.5"><Clock className="h-3 w-3" /> Abertura</p>
                  <p className="text-lg font-bold">{selectedOrder?.created_at?.toDate().toLocaleTimeString("pt-BR")}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">Itens Consumidos</p>
                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-800 rounded-2xl flex items-center justify-center">
                          <Pizza className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-200 leading-tight">{item.product_name}</p>
                          <p className="text-xs text-zinc-500">{item.quantity}x {fmt(item.unit_price)}</p>
                        </div>
                      </div>
                      <span className="font-black text-orange-400">{fmt(item.total_price)}</span>
                    </div>
                  ))}
                  {orderItems.length === 0 && <p className="p-4 text-sm text-zinc-600">Nenhum item encontrado.</p>}
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">Transações de Pagamento</p>
                <div className="bg-zinc-950 rounded-3xl border border-white/5 p-4 space-y-3">
                  {orderPayments.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic p-2">Nenhum pagamento registrado ainda.</p>
                  ) : orderPayments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        <span className="text-xs font-bold text-zinc-300">{PAY_LABELS[p.method]?.label || p.method}</span>
                      </div>
                      <span className="text-sm font-black text-white">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <div className="flex justify-between text-sm text-zinc-500 font-medium">
                      <span>Subtotal</span>
                      <span>{fmt(selectedOrder?.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-white">
                      <span>Total Geral</span>
                      <span className="text-orange-500">{fmt(selectedOrder?.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                  onClick={handlePrint}
                  className="bg-white text-black hover:bg-zinc-200 rounded-2xl py-6 font-black uppercase tracking-tight gap-2"
                >
                  <Printer className="h-4 w-4" /> Imprimir Cupom
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedOrder(null)}
                  className="border-zinc-800 bg-zinc-900 text-white rounded-2xl py-6 font-black uppercase tracking-tight"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
