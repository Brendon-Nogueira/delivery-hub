import React, { useEffect } from 'react';
import { ChefHat, Printer, CheckCircle, Clock, Utensils, MessageSquare, Trash2 } from 'lucide-react';
import { audioSynth } from '../utils/audio';
import { printThermalReceipt } from '../utils/thermalPrinter';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

export interface OrderItemDetail {
  id?: string;
  quantity: number;
  unitPrice?: number | string;
  menuItem?: {
    id: string;
    name: string;
    price?: number | string;
  };
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  totalPrice?: number | string;
  notes?: string;
  restaurantId?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  items?: OrderItemDetail[];
  restaurant?: {
    id?: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface RestaurantViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onClearOrders?: () => void;
}

export const RestaurantView: React.FC<RestaurantViewProps> = ({ orders, onUpdateStatus, onClearOrders }) => {
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  
  useEffect(() => {
    if (pendingOrders.length > 0) {
      audioSynth.startRestaurantAlarm();
    } else {
      audioSynth.stopRestaurantAlarm();
    }

    return () => {
      audioSynth.stopRestaurantAlarm();
    };
  }, [pendingOrders.length]);

  const getOrderItems = (order: Order) => {
    if (order.items && order.items.length > 0) {
      return order.items.map((i) => ({
        name: i.menuItem?.name || 'Item do Cardápio',
        qty: i.quantity,
        price: typeof i.unitPrice === 'string' ? parseFloat(i.unitPrice) : Number(i.unitPrice) || 25.9,
      }));
    }
    return [{ name: 'Prato Feito Especial', qty: 1, price: 25.9 }];
  };

  const getOrderTotal = (order: Order, items: Array<{ qty: number; price: number }>) => {
    if (order.totalPrice) {
      return typeof order.totalPrice === 'string' ? parseFloat(order.totalPrice) : Number(order.totalPrice);
    }
    return items.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  };

  const handleAcceptOrder = (order: Order) => {
    audioSynth.playSuccessSound();
    onUpdateStatus(order.id, 'PREPARING');

    const items = getOrderItems(order);
    const total = getOrderTotal(order, items);

    printThermalReceipt({
      orderId: order.id,
      customerName: order.customer?.name || 'Cliente App',
      customerAddress: 'Praça Cel. José Vieira, Paraisópolis - MG',
      items,
      total,
      paymentMethod: 'PIX (Confirmado)',
      notes: order.notes,
      createdAt: order.createdAt,
    });
  };

  const handleOrderReady = (orderId: string) => {
    onUpdateStatus(orderId, 'READY');
  };

  const OrderCard = ({ order, isPending = false }: { order: Order; isPending?: boolean }) => {
    const items = getOrderItems(order);
    const total = getOrderTotal(order, items);
    const customerName = order.customer?.name || 'Cliente';

    return (
      <div
        className={`p-4 rounded-2xl border transition-all duration-300 ${
          isPending
            ? 'border-brand-300 bg-brand-50/50 shadow-brand-glow'
            : 'border-zinc-200/60 bg-white hover:border-zinc-300'
        } mb-3.5 shadow-card`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                #{order.id.slice(0, 8)}
              </span>
              {isPending && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
              )}
            </div>
            <div className="font-extrabold text-zinc-900 text-base mt-1 tracking-tight">{customerName}</div>
            {order.customer?.phone && (
              <span className="text-[11px] text-zinc-400">{order.customer.phone}</span>
            )}
          </div>
          <div className="text-xs text-zinc-600 flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-xl border border-zinc-200/60 font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Lista de Itens Estilo Comanda */}
        <div className="text-xs text-zinc-600 mb-3 border-l-2 border-brand-400 pl-3 py-1.5 space-y-1.5 bg-zinc-50 rounded-r-xl">
          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-white text-brand-600 flex items-center justify-center text-[10px] font-black border border-zinc-200">
                  {it.qty}x
                </span>
                <span>{it.name}</span>
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>

        {/* Observações */}
        {order.notes && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <span className="font-medium">Obs: {order.notes}</span>
          </div>
        )}

        {/* Total do Pedido */}
        <div className="flex justify-between items-center text-xs font-bold text-zinc-400 mb-4 pt-2.5 border-t border-zinc-100">
          <span>Total do Pedido:</span>
          <span className="text-emerald-600 font-mono text-sm font-black">
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {order.status === 'PENDING' && (
          <button
            onClick={() => handleAcceptOrder(order)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] text-xs"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            Aceitar & Imprimir Comanda
          </button>
        )}

        {order.status === 'PREPARING' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                printThermalReceipt({
                  orderId: order.id,
                  customerName,
                  customerAddress: 'Praça Cel. José Vieira, Paraisópolis - MG',
                  items,
                  total,
                  paymentMethod: 'PIX (Confirmado)',
                  notes: order.notes,
                  createdAt: order.createdAt,
                });
              }}
              className="p-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl transition border border-zinc-200 active:scale-[0.98]"
              title="Reimprimir Comanda Térmica"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOrderReady(order.id)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-sm active:scale-[0.98]"
            >
              <Utensils className="w-4 h-4" />
              Marcar como Pronto
            </button>
          </div>
        )}

        {order.status === 'READY' && (
          <div className="w-full bg-zinc-50 text-zinc-400 font-semibold py-3 rounded-xl text-center border border-zinc-200 border-dashed text-xs flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span>Aguardando Coleta do Entregador...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-fadeIn pb-24">
      {/* KDS Header */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-zinc-200/60 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">KDS — Kitchen Display System</h2>
            <p className="text-xs text-zinc-400">Painel Operacional em Tempo Real • Paraisópolis - MG</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {orders.length > 0 && onClearOrders && (
            <button
              onClick={onClearOrders}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-50 hover:bg-rose-50 hover:text-rose-600 border border-zinc-200 text-zinc-500 text-xs font-bold transition active:scale-95"
              title="Limpar pedidos de teste"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Fila</span>
            </button>
          )}

          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3.5 py-2 rounded-xl font-bold border border-rose-200 text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{pendingOrders.length} Novo(s) Pedido(s) Aguardando Confirmação</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Kanban KDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: Novos Pedidos */}
        <div className="bg-zinc-50/50 rounded-2xl border border-zinc-200/60 flex flex-col min-h-[520px] shadow-card">
          <div className="p-4 border-b border-zinc-200/60 flex justify-between items-center bg-white rounded-t-2xl">
            <h3 className="font-black text-zinc-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Novos Pedidos</span>
            </h3>
            <span className="bg-rose-50 text-rose-600 border border-rose-200 font-black px-2.5 py-0.5 rounded-lg text-xs">
              {pendingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 flex flex-col justify-center">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xs text-zinc-400 font-medium">Nenhum pedido pendente</p>
              </div>
            ) : (
              pendingOrders.map((o) => <OrderCard key={o.id} order={o} isPending={true} />)
            )}
          </div>
        </div>

        {/* Coluna 2: Em Preparo */}
        <div className="bg-zinc-50/50 rounded-2xl border border-zinc-200/60 flex flex-col min-h-[520px] shadow-card">
          <div className="p-4 border-b border-zinc-200/60 flex justify-between items-center bg-white rounded-t-2xl">
            <h3 className="font-black text-zinc-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Na Cozinha (Preparo)</span>
            </h3>
            <span className="bg-sky-50 text-sky-600 border border-sky-200 font-black px-2.5 py-0.5 rounded-lg text-xs">
              {preparingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 flex flex-col justify-center">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xs text-zinc-400 font-medium">Nenhum prato em preparo</p>
              </div>
            ) : (
              preparingOrders.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </div>
        </div>

        {/* Coluna 3: Prontos para Coleta */}
        <div className="bg-zinc-50/50 rounded-2xl border border-zinc-200/60 flex flex-col min-h-[520px] shadow-card">
          <div className="p-4 border-b border-zinc-200/60 flex justify-between items-center bg-white rounded-t-2xl">
            <h3 className="font-black text-zinc-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Prontos para Coleta</span>
            </h3>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-black px-2.5 py-0.5 rounded-lg text-xs">
              {readyOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 flex flex-col justify-center">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xs text-zinc-400 font-medium">Nenhum pedido aguardando coleta</p>
              </div>
            ) : (
              readyOrders.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
