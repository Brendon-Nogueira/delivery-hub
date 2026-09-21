import React, { useEffect } from 'react';
import { ChefHat, Printer, CheckCircle, Clock } from 'lucide-react';
import { audioSynth } from '../utils/audio';
import { printThermalReceipt } from '../utils/thermalPrinter';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

interface RestaurantViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const RestaurantView: React.FC<RestaurantViewProps> = ({ orders, onUpdateStatus }) => {
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  // Dispara alarme se houver pedidos pendentes
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

  const handleAcceptOrder = (order: Order) => {
    // Toca som de sucesso
    audioSynth.playSuccessSound();
    
    // Atualiza status via API (o App.tsx vai passar essa prop)
    onUpdateStatus(order.id, 'PREPARING');
    
    // Imprime a comanda
    printThermalReceipt({
      orderId: order.id,
      customerName: "Cliente Teste", // Em produção viria da API
      customerAddress: "Rua do Cliente, 123 - Centro, Paraisópolis - MG",
      items: [
        { name: "Prato Feito Especial", qty: 1, price: 25.90 },
        { name: "Refrigerante Lata", qty: 1, price: 6.00 }
      ],
      total: 31.90,
      paymentMethod: "PIX (Pago no App)",
      createdAt: order.createdAt
    });
  };

  const handleOrderReady = (orderId: string) => {
    onUpdateStatus(orderId, 'READY');
  };

  const OrderCard = ({ order, isPending = false }: { order: Order, isPending?: boolean }) => (
    <div className={`p-4 rounded-xl border ${isPending ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700 bg-slate-800'} mb-3`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-slate-400 font-mono">#{order.id.split('-')[0]}</span>
          <div className="font-bold text-white mt-1">Cliente Teste</div>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      <div className="text-sm text-slate-300 mb-4 border-l-2 border-slate-600 pl-3">
        1x Prato Feito Especial<br/>
        1x Refrigerante Lata
      </div>

      {order.status === 'PENDING' && (
        <button 
          onClick={() => handleAcceptOrder(order)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Aceitar & Imprimir
        </button>
      )}

      {order.status === 'PREPARING' && (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              // Re-imprime (útil se perdeu o papel)
              printThermalReceipt({
                orderId: order.id,
                customerName: "Cliente Teste",
                customerAddress: "Rua do Cliente, 123",
                items: [{ name: "Prato Feito Especial", qty: 1, price: 25.90 }, { name: "Refrigerante Lata", qty: 1, price: 6.00 }],
                total: 31.90,
                paymentMethod: "PIX",
                createdAt: order.createdAt
              });
            }}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleOrderReady(order.id)}
            className="flex-[3] bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 rounded-lg flex items-center justify-center transition-colors"
          >
            Marcar como Pronto
          </button>
        </div>
      )}

      {order.status === 'READY' && (
        <div className="w-full bg-slate-700/50 text-slate-400 font-medium py-2 rounded-lg text-center border border-slate-600/50 border-dashed">
          Aguardando Entregador...
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6">
      
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-lg">
            <ChefHat className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">KDS - Kitchen Display System</h2>
            <p className="text-sm text-slate-400">Restaurante Paraisópolis</p>
          </div>
        </div>
        {pendingOrders.length > 0 && (
          <div className="animate-pulse flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold border border-red-500/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            {pendingOrders.length} Novo(s) Pedido(s)!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Coluna 1: Novos */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800/50">
            <h3 className="font-bold text-white flex justify-between items-center">
              Novos Pedidos
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">{pendingOrders.length}</span>
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {pendingOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-10">Nenhum pedido novo</div>
            ) : (
              pendingOrders.map(order => <OrderCard key={order.id} order={order} isPending={true} />)
            )}
          </div>
        </div>

        {/* Coluna 2: Preparando */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800/50">
            <h3 className="font-bold text-white flex justify-between items-center">
              Em Preparo
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">{preparingOrders.length}</span>
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {preparingOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-10">Nenhum pedido em preparo</div>
            ) : (
              preparingOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </div>

        {/* Coluna 3: Prontos */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800/50">
            <h3 className="font-bold text-white flex justify-between items-center">
              Prontos (Retirada)
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">{readyOrders.length}</span>
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {readyOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-10">Nenhum pedido aguardando retirada</div>
            ) : (
              readyOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
