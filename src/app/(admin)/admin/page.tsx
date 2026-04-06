// Admin Dashboard Page
"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ChefHat, ShoppingBag, Banknote, Tag, Loader2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { stats, loading } = useDashboardStats(user?.restaurant_id);

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  // Pre-calcular dados visuais para o gráfico de barras
  const totalPaid = Object.values(stats.paymentMethods).reduce((a, b) => a + b, 0);
  const pixPct = totalPaid ? Math.round((stats.paymentMethods.pix / totalPaid) * 100) : 0;
  const ccPct = totalPaid ? Math.round((stats.paymentMethods.credit_card / totalPaid) * 100) : 0;
  const dbPct = totalPaid ? Math.round((stats.paymentMethods.debit_card / totalPaid) * 100) : 0;
  const cashPct = totalPaid ? Math.round((stats.paymentMethods.cash / totalPaid) * 100) : 0;

  return (
    <div className="p-8">
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard diário</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Olá, <span className="text-zinc-200 font-semibold">{user.name}</span>. Eis o resumo do seu caixa hoje.
        </p>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm hover:border-zinc-700 transition">
          <div className="mb-3 inline-flex rounded-lg bg-green-500/10 p-2">
            <Banknote className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-black text-white">{fmt(stats.totalRevenue)}</p>
          <div className="flex mt-1 items-center justify-between">
            <p className="text-sm text-zinc-400">Faturamento Hoje</p>
            <ArrowUpRight className="h-3.5 w-3.5 text-green-400" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm hover:border-zinc-700 transition">
          <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2">
            <ShoppingBag className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.closedOrders}</p>
          <p className="mt-1 text-sm text-zinc-400">Pedidos Encerrados</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm hover:border-zinc-700 transition">
          <div className="mb-3 inline-flex rounded-lg bg-orange-500/10 p-2">
            <ChefHat className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.openOrders}</p>
          <p className="mt-1 text-sm text-zinc-400">Pedidos Em Andamento</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm hover:border-zinc-700 transition">
          <div className="mb-3 inline-flex rounded-lg bg-purple-500/10 p-2">
            <Tag className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{fmt(stats.averageTicket)}</p>
          <p className="mt-1 text-sm text-zinc-400">Ticket Médio (TM)</p>
        </div>

      </div>

      {/* ── CHARTS / REPORTS ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mt-8">
        
        {/* Payment Methods Chart */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-base font-bold text-white mb-6">Meios de Recebimento</h2>
          
          {totalPaid === 0 ? (
            <div className="h-24 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-600">Nenhum pedido pago hoje.</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Stacked Progress Bar */}
              <div className="h-6 w-full flex rounded-full overflow-hidden bg-zinc-800">
                {pixPct > 0 && <div style={{width: `${pixPct}%`}} className="bg-emerald-500" title="Pix"></div>}
                {ccPct > 0 && <div style={{width: `${ccPct}%`}} className="bg-blue-500" title="Cartão de Crédito"></div>}
                {dbPct > 0 && <div style={{width: `${dbPct}%`}} className="bg-indigo-400" title="Cartão de Débito"></div>}
                {cashPct > 0 && <div style={{width: `${cashPct}%`}} className="bg-yellow-500" title="Dinheiro"></div>}
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-300">Pix ({pixPct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  <span className="text-zinc-300">Crédito ({ccPct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-400"></span>
                  <span className="text-zinc-300">Débito ({dbPct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                  <span className="text-zinc-300">Dinheiro ({cashPct}%)</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Small Analytics Info / CTA  */}
        <div className="col-span-1 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-yellow-500 mb-2">Visão do Negócio</h3>
          <p className="text-sm text-yellow-500/80 leading-relaxed mb-4">
            Aqui você acompanha os lucros do seu turno atual. Utilize a frente de caixa (PDV) para abrir pedidos nas mesas e enviá-los à cozinha (KDS). O faturamento atualizará em tempo real.
          </p>
        </div>

      </div>
    </div>
  );
}
