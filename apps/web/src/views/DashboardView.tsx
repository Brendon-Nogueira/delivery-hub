import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Award,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Truck,
  Activity,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface TopItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

interface RestaurantStats {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageTicket: number;
  ordersByStatus: Record<string, number>;
  topSellingItems: TopItem[];
}

interface DashboardViewProps {
  restaurantId: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Novos Pedidos', color: 'text-amber-600', bg: 'bg-amber-500' },
  CONFIRMED: { label: 'Confirmados', color: 'text-blue-600', bg: 'bg-blue-500' },
  PREPARING: { label: 'Na Cozinha', color: 'text-indigo-600', bg: 'bg-indigo-500' },
  READY_FOR_PICKUP: { label: 'Prontos para Coleta', color: 'text-purple-600', bg: 'bg-purple-500' },
  PICKED_UP: { label: 'Coletados', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  IN_TRANSIT: { label: 'Em Rota de Entrega', color: 'text-teal-600', bg: 'bg-teal-500' },
  DELIVERED: { label: 'Entregues com Sucesso', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelados', color: 'text-rose-600', bg: 'bg-rose-500' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({ restaurantId }) => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  /**
   * CONCEITO: Endpoint Agregado de Analytics
   * Em vez de fazer múltiplas requisições para contar pedidos, somar faturamento
   * e achar os pratos mais vendidos, o backend executa essas queries via Prisma
   * em uma única chamada.
   */
  const loadStats = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const data = await apiFetch<RestaurantStats>(
        `/api/v1/orders/restaurant/${restaurantId}/stats`
      );
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      addToast({
        title: 'Erro ao carregar métricas',
        message: err.message || 'Verifique se você está autenticado como Restaurante.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [restaurantId]);

  // Formatação de Moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Cálculo da taxa de conversão / sucesso
  const successRate = stats && stats.totalOrders > 0
    ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
    : 0;

  // Maior quantidade de vendas para normalizar barras de progresso dos pratos
  const maxItemSales = stats?.topSellingItems?.[0]?.quantity || 1;

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Dashboard de Vendas & Desempenho
            </h2>
          </div>
          <p className="text-sm text-zinc-500">
            Acompanhe o faturamento, ticket médio e fluxo de pedidos em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 hidden sm:inline">
            Atualizado às {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={loadStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs transition active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* KPI Cards em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Faturamento Total
            </span>
            <span className="p-2 rounded-xl bg-emerald-500 text-white">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight">
              {loading ? '---' : formatCurrency(stats?.totalRevenue || 0)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pedidos Entregues</span>
            </div>
          </div>
        </div>

        {/* Card: Total de Pedidos */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Volume de Pedidos
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight">
              {loading ? '---' : stats?.totalOrders || 0}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              <strong className="text-emerald-600">{stats?.completedOrders || 0}</strong> finalizados com sucesso
            </p>
          </div>
        </div>

        {/* Card: Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Ticket Médio
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight">
              {loading ? '---' : formatCurrency(stats?.averageTicket || 0)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Média por pedido concluído
            </p>
          </div>
        </div>

        {/* Card: Em Andamento / Ativos */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Operação em Tempo Real
            </span>
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight">
                {loading ? '---' : stats?.activeOrders || 0}
              </p>
              {stats && stats.activeOrders > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                  Ativos Agora
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Taxa de conclusão: <strong className="text-zinc-800">{successRate}%</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Seção Principal: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Pratos Mais Vendidos (Ranking) */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-zinc-900 text-base">Pratos Mais Populares</h3>
              </div>
              <span className="text-xs text-zinc-400">Top 5 por volume</span>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-zinc-100 rounded-lg"></div>
                ))}
              </div>
            ) : !stats?.topSellingItems || stats.topSellingItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                Nenhum prato vendido ainda. Assim que pedidos forem concluídos, o ranking aparecerá aqui.
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topSellingItems.map((item, index) => {
                  const percentage = Math.round((item.quantity / maxItemSales) * 100);
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;

                  return (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isGold
                                ? 'bg-amber-400 text-amber-950 shadow-sm'
                                : isSilver
                                ? 'bg-zinc-300 text-zinc-800'
                                : isBronze
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-semibold text-zinc-800 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-zinc-500 font-medium">
                            {item.quantity} {item.quantity === 1 ? 'venda' : 'vendas'}
                          </span>
                          <span className="font-bold text-zinc-900 w-16 text-right">
                            {formatCurrency(item.revenue)}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGold
                              ? 'bg-amber-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-xs text-zinc-400 flex items-center justify-between">
            <span>Baseado no histórico total de pedidos</span>
            <span className="text-brand-600 font-medium">Atualizado em tempo real</span>
          </div>
        </div>

        {/* Coluna 2: Status dos Pedidos (Distribuição) */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-zinc-900 text-base">Fluxo de Pedidos por Etapa</h3>
              </div>
              <span className="text-xs text-zinc-400">Pipeline de Produção</span>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-zinc-100 rounded-lg"></div>
                ))}
              </div>
            ) : !stats || stats.totalOrders === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                Nenhum pedido registrado até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(STATUS_LABELS).map(([statusKey, meta]) => {
                  const count = stats.ordersByStatus[statusKey] || 0;
                  const ratio = stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;

                  return (
                    <div key={statusKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${meta.bg}`} />
                          <span className="font-medium text-zinc-700">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{count}</span>
                          <span className="text-[10px] text-zinc-400 w-8 text-right">
                            {ratio.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${meta.bg}`}
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="block text-[11px] text-zinc-500">Taxa de Conclusão</span>
              <strong className="text-sm font-bold text-emerald-600">{successRate}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="block text-[11px] text-zinc-500">Cancelamentos</span>
              <strong className="text-sm font-bold text-rose-600">
                {stats?.cancelledOrders || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
