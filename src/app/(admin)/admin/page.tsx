// Admin Dashboard Page
"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ChefHat, ShoppingBag, Banknote, Tag, Loader2, ArrowUpRight, XCircle, Utensils, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

  const hasActivity = stats.totalOrders > 0;
  const cancelRate = stats.totalOrders > 0 
    ? Math.round((stats.cancelledOrders / (stats.totalOrders + stats.cancelledOrders)) * 100) 
    : 0;

  return (
    <div className="p-8">
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard diário</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Olá, <span className="text-zinc-200 font-semibold">{user.name}</span>. Eis o resumo do seu caixa hoje.
        </p>
      </div>

      {/* ── ONBOARDING (when no activity) ── */}
      {!hasActivity && (
        <div className="mb-8 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-600/10 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/20">
              <Sparkles className="h-7 w-7 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Bem-vindo ao RestaurantOS!</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                Seu dashboard aparecerá aqui assim que os primeiros pedidos forem registrados. Comece criando suas <strong className="text-zinc-300">categorias</strong> e <strong className="text-zinc-300">produtos</strong>, depois abra um pedido no <strong className="text-zinc-300">PDV</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href="/admin/categories" 
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
              >
                Criar Categorias <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/admin/products" 
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-700 transition-all"
              >
                Criar Produtos
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm hover:border-zinc-700 transition">
          <div className="mb-3 inline-flex rounded-lg bg-red-500/10 p-2">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-black text-white">{cancelRate}%</p>
          <p className="mt-1 text-sm text-zinc-400">Taxa Cancelamento</p>
        </div>

      </div>

      {/* ── CHARTS / REPORTS ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mt-8">
        
        {/* Payment Methods Chart */}
        <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
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

        {/* Top 5 Products */}
        <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white">Top 5 Produtos</h2>
            <Utensils className="h-4 w-4 text-zinc-500" />
          </div>

          {stats.topProducts.length === 0 ? (
            <div className="h-24 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-600">Sem vendas hoje.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((product, i) => {
                const maxQty = stats.topProducts[0]?.quantity || 1;
                const pct = Math.round((product.quantity / maxQty) * 100);
                const colors = [
                  "bg-orange-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500"
                ];
                return (
                  <div key={product.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-white",
                          colors[i] || "bg-zinc-700"
                        )}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-white truncate max-w-[140px]">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-400 font-mono">{product.quantity}x</span>
                        <span className="text-zinc-300 font-bold">{fmt(product.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-700", colors[i] || "bg-zinc-600")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions / Business Insight */}
        <div className="col-span-1 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-bold text-yellow-500">Visão do Negócio</h3>
            </div>
            <p className="text-sm text-yellow-500/80 leading-relaxed mb-6">
              Aqui você acompanha os lucros do seu turno atual. Utilize a frente de caixa (PDV) para abrir pedidos nas mesas e enviá-los à cozinha (KDS). O faturamento atualizará em tempo real.
            </p>
          </div>
          
          <div className="space-y-2">
            <Link 
              href="/admin/pdv" 
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500/10 py-3 text-xs font-bold text-yellow-500 hover:bg-yellow-500/20 transition-all border border-yellow-500/20"
            >
              Abrir PDV <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link 
              href="/admin/sales-report" 
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
            >
              Ver Relatório Completo
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
