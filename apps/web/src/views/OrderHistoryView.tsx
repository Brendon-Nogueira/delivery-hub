/**
 * OrderHistoryView — Histórico de pedidos do cliente.
 *
 * CONCEITOS QUE VOCÊ VAI APRENDER:
 *
 * 1. ESTADOS DE UI (SKILL.md Regra #5):
 *    Todo componente implementa 4 estados: Loading (skeletons),
 *    Empty (ilustração + CTA), Error (alerta + retry), Success (dados).
 *
 * 2. FETCH COM CLEANUP (isMounted):
 *    Quando o componente desmonta antes do fetch terminar, o `isMounted = false`
 *    impede que o setState seja chamado — evitando o warning "Can't perform a
 *    React state update on an unmounted component".
 *
 * 3. FORMATAÇÃO DE DATA:
 *    Usamos `Intl.DateTimeFormat` (API nativa do browser) para formatar datas
 *    em PT-BR. Não precisamos de biblioteca externa (date-fns) para isso.
 *
 * 4. MEMOIZAÇÃO COM useMemo:
 *    As categorias de status são calculadas uma vez e só recalculam quando
 *    `orders` muda. Isso evita filtrar o array a cada re-render.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Package,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'READY'
  | 'ON_THE_WAY';

interface HistoryOrder {
  id: string;
  status: OrderStatus;
  totalPrice: string | number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  restaurant?: { id: string; name: string };
  items?: Array<{
    quantity: number;
    menuItem?: { name: string };
  }>;
}

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

// Helpers de status
const isActiveStatus = (s: OrderStatus) =>
  [
    'PENDING',
    'ACCEPTED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'READY',
    'ON_THE_WAY',
  ].includes(s);

const isCompletedStatus = (s: OrderStatus) => s === 'DELIVERED';
const isCancelledStatus = (s: OrderStatus) => ['CANCELLED', 'REJECTED'].includes(s);

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  PENDING: { label: 'Pendente', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  ACCEPTED: { label: 'Aceito', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  CONFIRMED: { label: 'Confirmado', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  PREPARING: { label: 'Preparando', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  READY_FOR_PICKUP: { label: 'Pronto', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  READY: { label: 'Pronto', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  PICKED_UP: { label: 'Coletado', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  IN_TRANSIT: { label: 'A Caminho', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  ON_THE_WAY: { label: 'A Caminho', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  DELIVERED: { label: 'Entregue', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelado', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  REJECTED: { label: 'Recusado', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toFixed(2).replace('.', ',');
};

export const OrderHistoryView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const fetchOrders = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let isMounted = true;

    apiFetch<HistoryOrder[]>('/api/v1/orders/my')
      .then((data) => {
        if (isMounted) setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Erro ao carregar histórico');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    const cleanup = fetchOrders();
    return cleanup;
  }, [isAuthenticated]);

  //atualizações de status em tempo real via WebSocket/evento
  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ orderId: string; status: string; frontendStatus?: string }>;
      const { orderId, status } = customEvent.detail;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: status as OrderStatus } : o))
      );
    };

    window.addEventListener('order:status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('order:status-changed', handleStatusChanged);
    };
  }, []);

  // Filtrar pedidos por aba
  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return orders.filter((o) => isActiveStatus(o.status));
      case 'completed':
        return orders.filter((o) => isCompletedStatus(o.status));
      case 'cancelled':
        return orders.filter((o) => isCancelledStatus(o.status));
      default:
        return orders;
    }
  }, [orders, activeTab]);

  // Contagens para os badges das abas
  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((o) => isActiveStatus(o.status)).length,
      completed: orders.filter((o) => isCompletedStatus(o.status)).length,
      cancelled: orders.filter((o) => isCancelledStatus(o.status)).length,
    }),
    [orders]
  );

  const tabs: Array<{ key: FilterTab; label: string; icon: React.ElementType }> = [
    { key: 'all', label: 'Todos', icon: ClipboardList },
    { key: 'active', label: 'Ativos', icon: Clock },
    { key: 'completed', label: 'Entregues', icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelados', icon: XCircle },
  ];

  // Se não autenticado, mostra aviso
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-7 h-7 text-zinc-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900">Faça login para ver seu histórico</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Seus pedidos anteriores aparecerão aqui após fazer login.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full pb-20 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200/60 shadow-card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">Meus Pedidos</h2>
              <p className="text-xs text-zinc-400">Histórico completo de pedidos</p>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 text-zinc-500 hover:text-zinc-700 transition active:scale-95 disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs de Filtro */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          const count = counts[tab.key];
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow'
                  : 'bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Estados de UI: Loading, Error, Empty, Success */}
      {loading ? (
        // LOADING STATE — Skeletons (SKILL.md: nunca usar spinner centralizado)
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-zinc-200/60 p-5 animate-pulse shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl" />
                  <div>
                    <div className="h-4 bg-zinc-100 rounded w-40 mb-1.5" />
                    <div className="h-3 bg-zinc-100 rounded w-24" />
                  </div>
                </div>
                <div className="h-6 bg-zinc-100 rounded-full w-20" />
              </div>
              <div className="flex gap-2">
                <div className="h-3 bg-zinc-100 rounded w-28" />
                <div className="h-3 bg-zinc-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // ERROR STATE
        <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200/60 p-8 shadow-card">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">Erro ao carregar pedidos</h3>
          <p className="text-zinc-500 text-xs mt-1 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-xs transition shadow-brand-glow active:scale-95"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        // EMPTY STATE
        <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200/60 p-8 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-zinc-300" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            {activeTab === 'all'
              ? 'Nenhum pedido realizado'
              : activeTab === 'active'
              ? 'Nenhum pedido ativo'
              : activeTab === 'completed'
              ? 'Nenhum pedido entregue'
              : 'Nenhum pedido cancelado'}
          </h3>
          <p className="text-zinc-400 text-xs mt-1 mb-6">
            {activeTab === 'all'
              ? 'Quando você fizer um pedido, ele aparecerá aqui.'
              : 'Não há pedidos nessa categoria no momento.'}
          </p>
          {activeTab === 'all' && (
            <button
              onClick={() => {}} // Navegar para cardápio — controlado pelo App
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-xs transition shadow-brand-glow active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 inline mr-1.5" />
              Fazer meu primeiro pedido
            </button>
          )}
        </div>
      ) : (
        // SUCCESS STATE — Lista de pedidos
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.PENDING;
            const itemNames =
              order.items?.map((i) => `${i.quantity}x ${i.menuItem?.name || 'Item'}`).join(', ') ||
              'Pedido realizado';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-zinc-200/60 p-5 shadow-card hover:shadow-card-hover hover:border-zinc-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    {/* Monograma do restaurante */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 border border-zinc-200/60 flex items-center justify-center text-xs font-black text-brand-600 flex-shrink-0">
                      {order.restaurant?.name?.slice(0, 2).toUpperCase() || 'DH'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-brand-600 transition-colors">
                        {order.restaurant?.name || 'Restaurante'}
                      </h4>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(order.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}
                    >
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>

                {/* Itens resumidos */}
                <p className="text-xs text-zinc-500 line-clamp-1 mb-2.5">{itemNames}</p>

                {/* Notas */}
                {order.notes && (
                  <p className="text-[11px] text-zinc-400 italic mb-2.5">
                    Obs: {order.notes}
                  </p>
                )}

                {/* Rodapé: preço + ID */}
                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-sm font-black text-zinc-900">
                    R$ {formatPrice(order.totalPrice)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
