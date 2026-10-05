import React, { useState, useEffect } from 'react';
import { Bike, Map, Navigation, CheckCircle, Navigation2, RotateCw, Flag, Sparkles } from 'lucide-react';
import { MapTracker } from '../components/MapTracker';
import { resolveOrderCoordinates } from '../services/geocodingService';
import { apiFetch } from '../utils/api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  totalPrice?: number | string;
  notes?: string;
  restaurantId?: string;
  customer?: { id?: string; name?: string; phone?: string };
  restaurant?: { id?: string; name?: string; address?: string; latitude?: number; longitude?: number };
  items?: any[];
}

interface DriverViewProps {
  orders: Order[];
  onAcceptDelivery: (orderId: string) => void;
  onCompleteDelivery: (orderId: string) => void;
  driverLocation: any | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
}

const extractDeliveryAddress = (notes?: string) => {
  if (!notes) return 'Centro, Paraisópolis - MG';
  const match = notes.match(/\[Entrega:\s*(.*?)(\s*\|\s*GPS:[^\]]*)?\]/);
  return match && match[1] ? match[1].trim() : notes;
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

  const [resolvedCustomerLoc, setResolvedCustomerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [isArrivedAtCustomer, setIsArrivedAtCustomer] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Resolve as coordenadas exatas da entrega a partir do notes do pedido ativo
  useEffect(() => {
    if (activeDelivery?.notes) {
      resolveOrderCoordinates(activeDelivery.notes).then(coords => {
        setResolvedCustomerLoc(coords);
      });
    } else {
      setResolvedCustomerLoc(null);
      setIsArrivedAtCustomer(false);
    }
  }, [activeDelivery?.notes]);

  // Escuta chegada ao destino do entregador
  useEffect(() => {
    const handleArrived = () => setIsArrivedAtCustomer(true);
    window.addEventListener('driver:arrived', handleArrived);
    return () => window.removeEventListener('driver:arrived', handleArrived);
  }, []);

  useEffect(() => {
    if (driverLocation?.isArrived) {
      setIsArrivedAtCustomer(true);
    }
  }, [driverLocation?.isArrived]);

  const activeRestaurantLocation = {
    lat: activeDelivery?.restaurant?.latitude || restaurantLocation.lat,
    lng: activeDelivery?.restaurant?.longitude || restaurantLocation.lng,
  };
  const activeCustomerLocation = resolvedCustomerLoc || customerLocation;
  const deliveryAddress = extractDeliveryAddress(activeDelivery?.notes);

  const handleOpenWaze = (lat: number, lng: number) => {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  };

  const handleOpenGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const handleRestartSimulation = async (orderId: string) => {
    setIsRestarting(true);
    setIsArrivedAtCustomer(false);

    // 1. Dispara animação visual no mapa imediatamente (veículo tracejando a rota)
    window.dispatchEvent(new CustomEvent('map:start-simulation'));

    // 2. Dispara simulação no backend e WebSockets
    try {
      await apiFetch(`/api/v1/delivery/simulate-trip/${orderId}`, {
        method: 'POST',
        data: {
          startLat: activeRestaurantLocation.lat,
          startLng: activeRestaurantLocation.lng,
          endLat: activeCustomerLocation.lat,
          endLng: activeCustomerLocation.lng,
        }
      });
    } catch (err) {
      console.error('Erro ao reiniciar simulação no backend:', err);
    } finally {
      setTimeout(() => setIsRestarting(false), 800);
    }
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
      <div className="bg-zinc-900 px-5 py-4 border-b border-zinc-800 relative z-10">
        <div className="flex justify-between items-center text-white">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                <Bike className="w-4 h-4 text-orange-500" />
              </div>
              <h2 className="font-extrabold text-base tracking-tight text-white">Driver App</h2>
            </div>
            <p className="text-zinc-400 font-medium text-xs mt-0.5">Online • Paraisópolis, MG</p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-400 tracking-wide">DISPONÍVEL</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 p-4 relative z-0">
        {activeDelivery ? (
          /* Trajeto Ativo */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                    <Navigation2 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-zinc-900 text-base">Entrega em Andamento</h3>
                    <p className="text-zinc-400 text-xs font-mono">Pedido #{activeDelivery.id.split('-')[0]}</p>
                  </div>
                </div>

                {/* Botão de Repetir Simulação */}
                <button
                  onClick={() => handleRestartSimulation(activeDelivery.id)}
                  disabled={isRestarting}
                  title="Reiniciar Simulação GPS em Ruas Reais"
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-orange-600 font-bold text-[11px] flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin text-orange-500' : ''}`} />
                  <span className="hidden sm:inline">Replay</span>
                </button>
              </div>

              {/* Banner de Chegada ao Destino */}
              {isArrivedAtCustomer && (
                <div className="bg-emerald-50 text-emerald-950 rounded-2xl p-3.5 border border-emerald-200 animate-fadeIn mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="leading-tight">
                    <h4 className="font-bold text-xs sm:text-sm text-emerald-900">Você Chegou ao Destino!</h4>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      Entregue o pedido ao cliente no endereço e confirme a finalização abaixo.
                    </p>
                  </div>
                </div>
              )}

              {/* Mapa de Ruas Reais */}
              <div className="h-80 rounded-2xl overflow-hidden mb-4 border border-zinc-200 shadow-sm relative">
                <MapTracker
                  restaurantLocation={activeRestaurantLocation}
                  customerLocation={activeCustomerLocation}
                  driverLocation={driverLocation}
                  orderStatus={activeDelivery.status}
                  customerAddressName={deliveryAddress}
                  restaurantName={activeDelivery.restaurant?.name || 'Restaurante'}
                  onArrival={() => setIsArrivedAtCustomer(true)}
                />
              </div>

              {/* Deep Links GPS */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button 
                  onClick={() => handleOpenWaze(activeCustomerLocation.lat, activeCustomerLocation.lng)}
                  className="bg-sky-50 text-sky-700 border border-sky-200/80 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-sky-100 transition-all active:scale-[0.98] text-xs shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  Abrir no Waze
                </button>
                <button 
                  onClick={() => handleOpenGoogleMaps(activeCustomerLocation.lat, activeCustomerLocation.lng)}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all active:scale-[0.98] text-xs shadow-xs"
                >
                  <Map className="w-4 h-4" />
                  Google Maps
                </button>
              </div>

              {/* Endereço de Entrega */}
              <div className="bg-zinc-50 rounded-xl p-3 mb-4 border border-zinc-200/60">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Endereço de Entrega</p>
                  <span className="text-[10px] font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-bold border border-orange-200/60">
                    GPS Preciso
                  </span>
                </div>
                <p className="text-zinc-900 font-bold text-xs leading-relaxed">{deliveryAddress}</p>
              </div>

              {/* Botão de Finalizar */}
              <button 
                onClick={() => onCompleteDelivery(activeDelivery.id)}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm ${
                  isArrivedAtCustomer
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-4 ring-emerald-500/20'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                {isArrivedAtCustomer ? 'Confirmar Entrega Concluída' : 'Finalizar Entrega'}
              </button>
            </div>
          </div>
        ) : (
          /* Buscando Entregas */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-zinc-900 text-base">Corridas Disponíveis</h3>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
                {availableDeliveries.length} pronta(s)
              </span>
            </div>
            
            {availableDeliveries.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-orange-300 animate-ping"></div>
                  <Navigation2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
                <p className="text-zinc-800 font-bold text-sm">Procurando corridas...</p>
                <p className="text-zinc-500 text-xs mt-1">Você será alertado quando um restaurante finalizar um pedido</p>
              </div>
            ) : (
              availableDeliveries.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-zinc-200/60 shadow-sm relative overflow-hidden transition-all hover:border-zinc-300 hover:shadow-md">
                  {/* Faixa lateral decorativa */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        {order.restaurant?.name || 'Restaurante'}
                      </span>
                      <h4 className="font-extrabold text-zinc-900 mt-1.5 text-base">Retirada • #{order.id.split('-')[0]}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-600 font-extrabold text-lg">R$ 6,50</span>
                      <p className="text-zinc-400 text-[11px] font-medium mt-0.5">Corrida no Bairro</p>
                    </div>
                  </div>
                  
                  <div className="pl-2 flex items-center gap-3 text-xs text-zinc-500 mb-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div>
                      <div className="w-0.5 h-5 bg-zinc-200"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
                    </div>
                    <div className="leading-tight">
                      <p className="mb-2 font-medium text-zinc-700">{order.restaurant?.name || 'Restaurante'} (Retirada)</p>
                      <p className="font-medium text-zinc-700 truncate max-w-[260px]">{extractDeliveryAddress(order.notes)} (Entrega)</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => onAcceptDelivery(order.id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm text-xs"
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
