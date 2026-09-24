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
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  items?: OrderItemDetail[];
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
        className={`p-4 rounded-2xl border transition-all ${
          isPending
            ? 'border-red-500/50 bg-red-950/20 shadow-lg shadow-red-500/5'
            : 'border-slate-800 bg-slate-900/90'
        } mb-3`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs font-mono text-slate-400">
              #{order.id.slice(0, 8)}
            </span>
            <div className="font-bold text-white text-base mt-0.5">{customerName}</div>
            {order.customer?.phone && (
              <span className="text-[11px] text-slate-500">{order.customer.phone}</span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <Clock className="w-3 h-3 text-emerald-400" />
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Lista Itens  */}
        <div className="text-xs text-slate-300 mb-3 border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1 bg-slate-950/30 rounded-r-lg">
          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="font-medium text-white">
                {it.qty}x {it.name}
              </span>
              <span className="text-slate-400 font-mono">
                R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>

        {/* Observações */}
        {order.notes && (
          <div className="mb-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Obs: {order.notes}</span>
          </div>
        )}

        {/* Total do Pedido */}
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-4 pt-2 border-t border-slate-800">
          <span>Total:</span>
          <span className="text-emerald-400 font-mono text-sm">
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {order.status === 'PENDING' && (
          <button
            onClick={() => handleAcceptOrder(order)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
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
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
              title="Reimprimir Comanda"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOrderReady(order.id)}
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition text-sm shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Utensils className="w-4 h-4" />
              Marcar como Pronto
            </button>
          </div>
        )}

        {order.status === 'READY' && (
          <div className="w-full bg-slate-800/60 text-slate-400 font-medium py-2.5 rounded-xl text-center border border-slate-700/60 border-dashed text-xs">
            Aguardando Coleta do Entregador...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-fadeIn">
      {/* KDS */}
      <div className="bg-zinc-900 rounded-2xl p-4 md:p-5 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500 border border-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">KDS — Kitchen Display System</h2>
            <p className="text-xs text-zinc-400">Painel Operacional da Cozinha • Paraisópolis - MG</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {orders.length > 0 && onClearOrders && (
            <button
              onClick={onClearOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 border border-zinc-700/80 text-zinc-400 text-xs font-semibold transition"
              title="Limpar pedidos de teste"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Fila</span>
            </button>
          )}

          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-xl font-bold border border-red-500/20 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{pendingOrders.length} Novo(s) Pedido(s) Aguardando Confirmação</span>
            </div>
          )}
        </div>
      </div>

    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
   
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Novos Pedidos</span>
            </h3>
            <span className="bg-zinc-800 text-zinc-300 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {pendingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12">Nenhum pedido pendente</p>
            ) : (
              pendingOrders.map((o) => <OrderCard key={o.id} order={o} isPending={true} />)
            )}
          </div>
        </div>

   
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Na Cozinha (Preparo)</span>
            </h3>
            <span className="bg-zinc-800 text-zinc-300 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {preparingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {preparingOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12">Nenhum prato em preparo</p>
            ) : (
              preparingOrders.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </div>
        </div>

     
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Prontos para Coleta</span>
            </h3>
            <span className="bg-zinc-800 text-zinc-300 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {readyOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {readyOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12">Nenhum pedido aguardando coleta</p>
            ) : (
              readyOrders.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
