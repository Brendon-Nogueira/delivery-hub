import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleNavigation, Role } from './components/RoleNavigation';
import { CustomerView } from './views/CustomerView';
import { RestaurantView, Order as RestaurantOrder } from './views/RestaurantView';
import { DriverView } from './views/DriverView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { audioSynth } from './utils/audio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserHeader } from './components/UserHeader';
import { apiFetch, API_BASE_URL } from './utils/api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

/**
 * STATUS → MENSAGEM TOAST
 * Mapeia cada transição de status a uma mensagem de toast.
 * Conceito: Lookup table (Record) é mais limpo que um switch/case.
 */
const statusToastMessages: Record<string, { title: string; message: string; type: 'success' | 'info' | 'warning' }> = {
  PENDING: { title: 'Pedido Enviado!', message: 'Aguardando confirmação do restaurante.', type: 'info' },
  PREPARING: { title: 'Pedido Aceito!', message: 'O restaurante começou a preparar seu prato.', type: 'success' },
  READY: { title: 'Pedido Pronto!', message: 'Aguardando o entregador coletar.', type: 'info' },
  ON_THE_WAY: { title: 'Saiu para Entrega!', message: 'O entregador está a caminho.', type: 'success' },
  DELIVERED: { title: 'Pedido Entregue!', message: 'Bom apetite! Avalie seu pedido.', type: 'success' },
};

function AppContent() {
  const { user, token, isAuthenticated, quickLogin } = useAuth();
  const { addToast } = useToast();
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
  const RESTAURANT_LOC = { lat: -22.5538, lng: -45.7796 };
  const CUSTOMER_LOC = { lat: -22.548, lng: -45.775 };

  // Auto-select role por perfil do usuário
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

  // Carregar pedidos iniciais do restaurante (para a view KDS)
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

  // Conexão e sincronização com WebSocket
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

    // Novo pedido recebido
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

      // Toast de novo pedido (para o restaurante)
      addToast({
        type: 'warning',
        title: 'Novo Pedido Recebido!',
        message: `Cliente ${order.customer?.name || 'App'} fez um pedido.`,
      });
    };

    ordSocket.on('newOrder', handleNewOrder);
    ordSocket.on('orderCreated', handleNewOrder);

    // Mudança de status
    const handleStatusChanged = (data: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
      );

      // Toast de mudança de status
      const toastConfig = statusToastMessages[data.status];
      if (toastConfig) {
        addToast(toastConfig);
      }

      if (data.status !== 'PENDING') {
        audioSynth.playSuccessSound();
      }
    };

    ordSocket.on('orderStatusChanged', handleStatusChanged);
    ordSocket.on('orderStatusUpdated', handleStatusChanged);

    // Telemetria do entregador (GPS)
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

  // Criar pedido
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

      ordersSocket?.emit('joinOrderRoom', { orderId: data.id });
      deliverySocket?.emit('joinDeliveryRoom', { orderId: data.id });

      addToast({
        type: 'success',
        title: 'Pedido Criado!',
        message: 'Seu pedido foi enviado ao restaurante.',
      });
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      addToast({
        type: 'error',
        title: 'Erro ao criar pedido',
        message: error.message || 'Verifique a conexão com o backend.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar status do pedido
  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    if (ordersSocket) {
      ordersSocket.emit('updateOrderStatus', { orderId, status });
    }
  };

  // Aceitar entrega
  const handleAcceptDelivery = async (orderId: string) => {
    handleUpdateStatus(orderId, 'ON_THE_WAY');

    addToast({
      type: 'success',
      title: 'Corrida Aceita!',
      message: 'Navegue até o restaurante para coletar o pedido.',
    });

    try {
      await apiFetch(`/api/v1/delivery/simulate-trip/${orderId}`, { method: 'POST' });
    } catch (error) {
      console.error('Erro ao iniciar simulação de entrega', error);
    }
  };

  // Finalizar entrega
  const handleCompleteDelivery = (orderId: string) => {
    handleUpdateStatus(orderId, 'DELIVERED');
    setDriverLocation(null);
    audioSynth.playSuccessSound();

    addToast({
      type: 'success',
      title: 'Entrega Finalizada!',
      message: 'Corrida concluída com sucesso.',
    });
  };

  // Limpar pedidos
  const handleClearOrders = async () => {
    if (window.confirm('Deseja limpar todos os pedidos da fila do KDS?')) {
      try {
        await apiFetch('/api/v1/orders/clear', { method: 'DELETE' });
        setOrders([]);
        setCurrentOrderId(null);
        addToast({
          type: 'info',
          title: 'Fila Limpa',
          message: 'Todos os pedidos foram removidos.',
        });
      } catch (error: any) {
        console.error('Erro ao limpar pedidos:', error);
        addToast({
          type: 'error',
          title: 'Erro ao limpar',
          message: error.message,
        });
      }
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const activeCustomerOrder = orders.find((o) => o.id === currentOrderId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-3 md:p-6 font-sans antialiased selection:bg-brand-500 selection:text-white relative">
      <div className="max-w-6xl mx-auto">
        <UserHeader />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <RoleNavigation
            currentRole={currentRole}
            onChangeRole={setCurrentRole}
            pendingOrdersCount={pendingCount}
          />

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-zinc-200/60 text-[11px] text-zinc-500 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="font-semibold text-zinc-700">
              {connected ? 'Tempo Real Ativo' : 'Offline'}
            </span>
            {user && (
              <span className="text-zinc-400 hidden md:inline font-medium">
                • {user.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Views */}
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

          {currentRole === 'HISTORY' && <OrderHistoryView />}

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

/**
 * CONCEITO: Composição de Providers
 *
 * AuthProvider > ToastProvider > AppContent
 *
 * A ordem importa:
 * - AuthProvider DEVE estar por fora do ToastProvider, porque o login pode
 *   precisar existir antes dos toasts
 * - ToastProvider DEVE envolver AppContent, para que useToast() funcione
 *   em qualquer componente filho
 */
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
