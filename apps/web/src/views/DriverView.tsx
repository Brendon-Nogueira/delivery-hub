import React from 'react';
import { Bike, Map, Navigation, CheckCircle, Navigation2 } from 'lucide-react';
import { MapTracker } from '../components/MapTracker';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

interface DriverViewProps {
  orders: Order[];
  onAcceptDelivery: (orderId: string) => void;
  onCompleteDelivery: (orderId: string) => void;
  driverLocation: { lat: number; lng: number } | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
}

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
    <div className="max-w-md mx-auto w-full min-h-[calc(100vh-180px)] bg-slate-900 rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl relative flex flex-col">
      {/* "Status bar"*/}
      <div className="bg-slate-950 px-6 py-2 flex justify-between items-center text-xs text-slate-400 font-medium z-10 relative">
        <span>12:00</span>
        <div className="flex items-center gap-2">
          <span>5G</span>
          <div className="w-5 h-3 bg-white rounded-sm"></div>
        </div>
      </div>

      {/* Header do App */}
      <div className="bg-orange-500 p-4 pt-6 rounded-b-3xl shadow-lg relative z-10">
        <div className="flex justify-between items-center text-slate-950">
          <div>
            <h2 className="font-black text-xl flex items-center gap-2">
              <Bike className="w-6 h-6" />
              Driver App
            </h2>
            <p className="text-orange-950 font-medium text-sm">Online • Paraisópolis, MG</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-900 custom-scrollbar p-4 relative z-0">
        
        {activeDelivery ? (
          /* trajeto ativo*/
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Navigation2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Entrega em andamento</h3>
                  <p className="text-slate-400 text-sm">Pedido #{activeDelivery.id.split('-')[0]}</p>
                </div>
              </div>

              {/* Mapa*/}
              <div className="h-48 rounded-xl overflow-hidden mb-4 border border-slate-700">
                <MapTracker
                  restaurantLocation={restaurantLocation}
                  customerLocation={customerLocation}
                  driverLocation={driverLocation}
                  orderStatus={activeDelivery.status}
                />
              </div>

              {/*(Deep Links)*/}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={() => handleOpenWaze(customerLocation.lat, customerLocation.lng)}
                  className="bg-blue-600/20 text-blue-400 border border-blue-600/30 font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Waze
                </button>
                <button 
                  onClick={() => handleOpenGoogleMaps(customerLocation.lat, customerLocation.lng)}
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition-colors"
                >
                  <Map className="w-4 h-4" />
                  G. Maps
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-500 font-medium mb-1">ENDEREÇO DO CLIENTE</p>
                <p className="text-white font-medium">Rua do Cliente, 123</p>
                <p className="text-slate-400 text-sm">Centro, Paraisópolis - MG</p>
              </div>

              <button 
                onClick={() => onCompleteDelivery(activeDelivery.id)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-5 h-5" />
                Finalizar Entrega
              </button>
            </div>
          </div>
        ) : (
          /* buscando entregas */
          <div className="space-y-4">
            <h3 className="font-bold text-slate-300 text-lg px-2">Corridas Disponíveis</h3>
            
            {availableDeliveries.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-ping"></div>
                  <Navigation2 className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-slate-400 font-medium">Procurando restaurantes próximos...</p>
              </div>
            ) : (
              availableDeliveries.map(order => (
                <div key={order.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg relative overflow-hidden">
                  {/* Detalhe visual laranja */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-medium">Restaurante Paraisópolis</span>
                      <h4 className="font-bold text-white mt-2 text-lg">Retirada • #{order.id.split('-')[0]}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-bold text-lg">R$ 6,50</span>
                      <p className="text-slate-500 text-xs mt-1">2.4 km total</p>
                    </div>
                  </div>
                  
                  <div className="pl-2 flex items-center gap-3 text-sm text-slate-400 mb-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div className="w-0.5 h-6 bg-slate-700"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div>
                      <p className="mb-2">Praça Cel. José Vieira (Restaurante)</p>
                      <p>Rua do Cliente, 123 (Entrega)</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => onAcceptDelivery(order.id)}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-3 rounded-xl transition-transform active:scale-95 shadow-lg shadow-orange-500/20"
                  >
                    Aceitar Corrida
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* fake do iOS */}
      <div className="bg-slate-900 pt-2 pb-1 flex justify-center">
        <div className="w-1/3 h-1 bg-slate-700 rounded-full"></div>
      </div>
    </div>
  );
};
