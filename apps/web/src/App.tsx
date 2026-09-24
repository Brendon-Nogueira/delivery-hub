import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleNavigation, Role } from './components/RoleNavigation';
import { CustomerView } from './views/CustomerView';
import { RestaurantView, Order as RestaurantOrder } from './views/RestaurantView';
import { DriverView } from './views/DriverView';
import { audioSynth } from './utils/audio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserHeader } from './components/UserHeader';
import { apiFetch, API_BASE_URL } from './utils/api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

function AppContent() {
  const { user, token, isAuthenticated, quickLogin } = useAuth();
  const [currentRole, setCurrentRole] = useState<Role>('CUSTOMER');

  // Sockets
  const [ordersSocket, setOrdersSocket] = useState<Socket | null>(null);
  const [deliverySocket, setDeliverySocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Pedidos e Telemetria
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Coordenadas fixas (Paraisópolis - MG)
  const RESTAURANT_LOC = { lat: -22.5538, lng: -45.7796 }; // Praça Cel. José Vieira
  const CUSTOMER_LOC = { lat: -22.548, lng: -45.775 }; // Bairro residencial

  
  useEffect(() => {
    if (user) {
      if (user.role === 'RESTAURANT_OWNER') {
        setCurrentRole('RESTAURANT');
      } else if (user.role === 'DRIVER') {
        setCurrentRole('DRIVER');
      } else if (user.role === 'CUSTOMER') {
        setCurrentRole('CUSTOMER');
      }
    }
  }, [user]);

  
  useEffect(() => {
    apiFetch<any[]>('/api/v1/orders/restaurant/rest-123')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const loaded: RestaurantOrder[] = data.map((d) => ({
            id: d.id,
            status: d.status as OrderStatus,
            createdAt: d.createdAt,
            totalPrice: d.totalPrice,
            notes: d.notes,
            customer: d.customer,
            items: d.items,
          }));
          setOrders(loaded);
        }
      })
      .catch((err) => console.log('Histórico inicial:', err));
  }, []);

  // Conexão e sincronização com WebSocket (autenticado com JWT via token)
  useEffect(() => {
    const socketOptions = token ? { auth: { token } } : {};
    const ordSocket = io(`${API_BASE_URL}/orders`, socketOptions);
    const dlvSocket = io(`${API_BASE_URL}/delivery`, socketOptions);

    setOrdersSocket(ordSocket);
    setDeliverySocket(dlvSocket);

    ordSocket.on('connect', () => {
      setConnected(true);
      ordSocket.emit('joinRestaurantRoom', { restaurantId: 'rest-123' });
      if (currentOrderId) {
        ordSocket.emit('joinOrderRoom', { orderId: currentOrderId });
      }
    });

    ordSocket.on('disconnect', () => setConnected(false));

    
    const handleNewOrder = (order: any) => {
      const formattedOrder: RestaurantOrder = {
        id: order.id,
        status: order.status || 'PENDING',
        createdAt: order.createdAt || new Date().toISOString(),
        totalPrice: order.totalPrice,
        notes: order.notes,
        customer: order.customer,
        items: order.items,
      };

      setOrders((prev) => {
        if (prev.some((o) => o.id === formattedOrder.id)) return prev;
        return [formattedOrder, ...prev];
      });

      
      setCurrentOrderId((prev) => prev || formattedOrder.id);
    };

    ordSocket.on('newOrder', handleNewOrder);
    ordSocket.on('orderCreated', handleNewOrder);

    
    const handleStatusChanged = (data: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
      );
      if (data.status !== 'PENDING') {
        audioSynth.playSuccessSound();
      }
    };

    ordSocket.on('orderStatusChanged', handleStatusChanged);
    ordSocket.on('orderStatusUpdated', handleStatusChanged);

    // Escuta telemetria do entregador (GPS)
    const handleLocationUpdate = (data: { orderId: string; lat: number; lng: number }) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    };

    dlvSocket.on('driverLocationUpdate', handleLocationUpdate);
    dlvSocket.on('locationUpdate', handleLocationUpdate);

    dlvSocket.on('deliveryComplete', () => {
      setDriverLocation(null);
      audioSynth.playSuccessSound();
    });

    return () => {
      ordSocket.disconnect();
      dlvSocket.disconnect();
    };
  }, [token, currentOrderId]);

  
  const handleCreateOrder = async (
    items: Array<{ menuItemId: string; quantity: number }>,
    notes?: string
  ) => {
    setIsLoading(true);
    try {
      
      if (!isAuthenticated) {
        await quickLogin('CUSTOMER');
      }

      const data = await apiFetch<any>('/api/v1/orders', {
        method: 'POST',
        data: {
          restaurantId: 'rest-123',
          items,
          notes,
        },
      });

      const newOrder: RestaurantOrder = {
        id: data.id,
        status: data.status || 'PENDING',
        createdAt: data.createdAt || new Date().toISOString(),
        totalPrice: data.totalPrice,
        notes: data.notes,
        customer: data.customer || (user ? { id: user.id, name: user.name, phone: user.phone } : undefined),
        items: data.items,
      };

      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      setCurrentOrderId(data.id);

      // Entra nas salas do pedido nos sockets
      ordersSocket?.emit('joinOrderRoom', { orderId: data.id });
      deliverySocket?.emit('joinDeliveryRoom', { orderId: data.id });

      audioSynth.playSuccessSound();
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      alert(`Erro ao criar pedido: ${error.message || 'Verifique a conexão com o backend'}`);
    } finally {
      setIsLoading(false);
    }
  };

 
  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    if (ordersSocket) {
      ordersSocket.emit('updateOrderStatus', { orderId, status });
    }
  };

  
  const handleAcceptDelivery = async (orderId: string) => {
    handleUpdateStatus(orderId, 'ON_THE_WAY');

    try {
      await apiFetch(`/api/v1/delivery/simulate-trip/${orderId}`, { method: 'POST' });
    } catch (error) {
      console.error('Erro ao iniciar simulação de entrega', error);
    }
  };

  const handleCompleteDelivery = (orderId: string) => {
    handleUpdateStatus(orderId, 'DELIVERED');
    setDriverLocation(null);
    audioSynth.playSuccessSound();
  };

  const handleClearOrders = async () => {
    if (window.confirm('Deseja limpar todos os pedidos da fila do KDS?')) {
      try {
        await apiFetch('/api/v1/orders/clear', { method: 'DELETE' });
        setOrders([]);
        setCurrentOrderId(null);
      } catch (error: any) {
        console.error('Erro ao limpar pedidos:', error);
      }
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const activeCustomerOrder = orders.find((o) => o.id === currentOrderId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 md:p-6 font-sans antialiased selection:bg-red-500 selection:text-white">
      <div className="max-w-6xl mx-auto">
        {/* Barra Usuário */}
        <UserHeader />

      
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <RoleNavigation
            currentRole={currentRole}
            onChangeRole={setCurrentRole}
            pendingOrdersCount={pendingCount}
          />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span>{connected ? 'Tempo Real Ativo' : 'Offline'}</span>
            {user && (
              <span className="text-zinc-500 hidden md:inline">
                • {user.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* View*/}
        <main>
          {currentRole === 'CUSTOMER' && (
            <CustomerView
              socketConnected={connected}
              orderStatus={activeCustomerOrder?.status || null}
              activeOrder={activeCustomerOrder}
              driverLocation={driverLocation}
              restaurantLocation={RESTAURANT_LOC}
              customerLocation={CUSTOMER_LOC}
              onCreateOrder={handleCreateOrder}
              isLoading={isLoading}
              onResetOrder={() => setCurrentOrderId(null)}
            />
          )}

          {currentRole === 'RESTAURANT' && (
            <RestaurantView
              orders={orders}
              onUpdateStatus={handleUpdateStatus}
              onClearOrders={handleClearOrders}
            />
          )}

          {currentRole === 'DRIVER' && (
            <DriverView
              orders={orders}
              onAcceptDelivery={handleAcceptDelivery}
              onCompleteDelivery={handleCompleteDelivery}
              driverLocation={driverLocation}
              restaurantLocation={RESTAURANT_LOC}
              customerLocation={CUSTOMER_LOC}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
