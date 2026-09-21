import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { MapTracker } from '../components/MapTracker';


type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface CustomerViewProps {
  socketConnected: boolean;
  orderStatus: OrderStatus | null;
  driverLocation: { lat: number; lng: number } | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
  onCreateOrder: () => void;
  isLoading: boolean;
}

const statusMessages: Record<OrderStatus, string> = {
  PENDING: "Aguardando o restaurante aceitar o pedido...",
  PREPARING: "O restaurante está preparando seu pedido!",
  READY: "Pedido pronto! Aguardando o entregador...",
  ON_THE_WAY: "O entregador está a caminho!",
  DELIVERED: "Pedido entregue. Bom apetite!"
};

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-slate-500",
  PREPARING: "bg-amber-500",
  READY: "bg-blue-500",
  ON_THE_WAY: "bg-orange-500",
  DELIVERED: "bg-emerald-500"
};

export const CustomerView: React.FC<CustomerViewProps> = ({
  socketConnected,
  orderStatus,
  driverLocation,
  restaurantLocation,
  customerLocation,
  onCreateOrder,
  isLoading
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
      <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Restaurante Paraisópolis</h2>
            <p className="text-slate-400">Pratos Feitos • Lanches • Bebidas</p>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl">
            <ShoppingBag className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        {!orderStatus ? (
          <div className="text-center py-8">
            <p className="text-slate-300 mb-6 max-w-md mx-auto">
              Simule a experiência de um cliente fazendo um pedido. 
              Você acompanhará todo o processo até a entrega em sua casa.
            </p>
            <button
              onClick={onCreateOrder}
              disabled={!socketConnected || isLoading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-lg w-full md:w-auto"
            >
              {isLoading ? 'Enviando Pedido...' : 'Fazer Pedido Teste'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${statusColors[orderStatus].replace('bg-', 'border-').replace('500', '500/30')} bg-slate-900/50`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[orderStatus]} animate-pulse`} />
                <h3 className="text-lg font-bold text-white">Status do Pedido</h3>
              </div>
              <p className="mt-2 text-slate-300 font-medium">{statusMessages[orderStatus]}</p>
            </div>

            {/* Stepper Vertical*/}
            <div className="flex flex-col gap-4 pl-2 relative before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-700">
              {(['PENDING', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED'] as OrderStatus[]).map((step, idx) => {
                const isActive = step === orderStatus;
                const stepsArray = ['PENDING', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED'];
                const isPast = stepsArray.indexOf(step) < stepsArray.indexOf(orderStatus!);

                return (
                  <div key={step} className="flex items-center gap-4 relative z-10">
                    <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      isActive ? `${statusColors[step]} border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]` : 
                      isPast ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800 border-slate-600'
                    }`} />
                    <span className={`font-medium transition-colors ${
                      isActive ? 'text-white' : 
                      isPast ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {statusMessages[step].split('!')[0].split('.')[0]} {/* Texto curto */}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Mapa aparece quando sai para entrega */}
            {orderStatus === 'ON_THE_WAY' && (
              <div className="mt-8 rounded-xl overflow-hidden border border-slate-700 shadow-2xl h-[400px]">
                <MapTracker
                  restaurantLocation={restaurantLocation}
                  customerLocation={customerLocation}
                  driverLocation={driverLocation}
                  orderStatus={orderStatus}
                />
              </div>
            )}

            {orderStatus === 'DELIVERED' && (
              <div className="pt-4 text-center">
                <button
                  onClick={onCreateOrder}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                  Fazer Novo Pedido
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
