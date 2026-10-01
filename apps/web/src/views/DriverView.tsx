import React from 'react';
import { Bike, Map, Navigation, CheckCircle, Navigation2 } from 'lucide-react';
import { MapTracker } from '../components/MapTracker';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  totalPrice?: number | string;
  notes?: string;
  restaurantId?: string;
  customer?: { id?: string; name?: string; phone?: string };
  restaurant?: { id?: string; name?: string; address?: string };
  items?: any[];
}

interface DriverViewProps {
  orders: Order[];
  onAcceptDelivery: (orderId: string) => void;
  onCompleteDelivery: (orderId: string) => void;
  driverLocation: { lat: number; lng: number } | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
}

const extractDeliveryAddress = (notes?: string) => {
  if (!notes) return 'Centro, Paraisópolis - MG';
  const match = notes.match(/\[Entrega:\s*(.*?)\]/);
  return match ? match[1] : notes;
};

export const DriverView: React.FC<DriverViewProps> = ({ 
  orders, 
  onAcceptDelivery, 
  onCompleteDelivery,
  driverLocation,
  restaurantLocation,
  customerLocation
}) => {
  // Entregador vê pedidos que estão prontos e entregues por ele
  const availableDeliveries = orders.filter(o => o.status === 'READY');
  const activeDelivery = orders.find(o => o.status === 'ON_THE_WAY');

  const handleOpenWaze = (lat: number, lng: number) => {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  };

  const handleOpenGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-md mx-auto w-full min-h-[calc(100vh-170px)] bg-white rounded-[2.5rem] overflow-hidden border-4 border-zinc-200 shadow-drawer relative flex flex-col">
      {/* Dynamic Island / Status Bar */}
      <div className="bg-zinc-900 px-7 py-3 flex justify-between items-center text-xs text-zinc-400 font-semibold z-10 relative">
        <span className="text-white">12:00</span>
        <div className="w-20 h-4 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-zinc-600 mr-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white">5G</span>
          <div className="w-5 h-2.5 bg-white rounded-sm p-0.5 flex items-center">
            <div className="w-full h-full bg-zinc-900 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Header do App Driver */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 p-5 pt-4 rounded-b-3xl shadow-lg relative z-10">
        <div className="flex justify-between items-center text-white">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-black text-xl tracking-tight">Driver App</h2>
            </div>
            <p className="text-white/80 font-medium text-xs mt-1">Online • Paraisópolis, MG</p>
          </div>

          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="text-xs font-black text-emerald-300">DISPONÍVEL</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 p-4 relative z-0">
        {activeDelivery ? (
          /* Trajeto Ativo */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/60 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <Navigation2 className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-base">Entrega em Andamento</h3>
                  <p className="text-zinc-400 text-xs font-mono">Pedido #{activeDelivery.id.split('-')[0]}</p>
                </div>
              </div>

              {/* Mapa */}
              <div className="h-52 rounded-xl overflow-hidden mb-4 border border-zinc-200 shadow-sm">
                <MapTracker
                  restaurantLocation={restaurantLocation}
                  customerLocation={customerLocation}
                  driverLocation={driverLocation}
                  orderStatus={activeDelivery.status}
                />
              </div>

              {/* Deep Links GPS */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button 
                  onClick={() => handleOpenWaze(customerLocation.lat, customerLocation.lng)}
                  className="bg-sky-50 text-sky-700 border border-sky-200 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-sky-100 transition active:scale-95 text-xs"
                >
                  <Navigation className="w-4 h-4" />
                  Abrir no Waze
                </button>
                <button 
                  onClick={() => handleOpenGoogleMaps(customerLocation.lat, customerLocation.lng)}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition active:scale-95 text-xs"
                >
                  <Map className="w-4 h-4" />
                  Google Maps
                </button>
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 mb-4 border border-zinc-200/60">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Endereço de Entrega</p>
                <p className="text-zinc-900 font-bold text-xs">{extractDeliveryAddress(activeDelivery.notes)}</p>
              </div>

              <button 
                onClick={() => onCompleteDelivery(activeDelivery.id)}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-600/30 text-sm"
              >
                <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                Finalizar Entrega
              </button>
            </div>
          </div>
        ) : (
          /* Buscando Entregas */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-zinc-800 text-base">Corridas Disponíveis</h3>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                {availableDeliveries.length} pronta(s)
              </span>
            </div>
            
            {availableDeliveries.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-300 animate-ping"></div>
                  <Navigation2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
                <p className="text-zinc-700 font-bold text-sm">Procurando corridas...</p>
                <p className="text-zinc-400 text-xs mt-1">Você será alertado quando um restaurante finalizar um pedido</p>
              </div>
            ) : (
              availableDeliveries.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-zinc-200/60 shadow-card relative overflow-hidden transition-all hover:border-zinc-300 hover:shadow-card-hover">
                  {/* Faixa lateral decorativa */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand-500 to-amber-500"></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        {order.restaurant?.name || 'Restaurante'}
                      </span>
                      <h4 className="font-black text-zinc-900 mt-1.5 text-base">Retirada • #{order.id.split('-')[0]}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-600 font-black text-lg">R$ 6,50</span>
                      <p className="text-zinc-400 text-[11px] font-medium mt-0.5">Corrida no Bairro</p>
                    </div>
                  </div>
                  
                  <div className="pl-2 flex items-center gap-3 text-xs text-zinc-500 mb-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div>
                      <div className="w-0.5 h-5 bg-zinc-200"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-sm"></div>
                    </div>
                    <div className="leading-tight">
                      <p className="mb-2 font-medium text-zinc-700">{order.restaurant?.name || 'Restaurante'} (Retirada)</p>
                      <p className="font-medium text-zinc-700 truncate max-w-[260px]">{extractDeliveryAddress(order.notes)} (Entrega)</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => onAcceptDelivery(order.id)}
                    className="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-500 text-white font-black py-3 rounded-xl transition active:scale-95 shadow-brand-glow text-xs"
                  >
                    Aceitar Corrida • R$ 6,50
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Barra Home do Smartphone */}
      <div className="bg-zinc-900 pt-2 pb-2 flex justify-center">
        <div className="w-1/3 h-1 bg-zinc-600 rounded-full"></div>
      </div>
    </div>
  );
};
