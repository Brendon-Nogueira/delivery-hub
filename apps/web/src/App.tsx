import React, { useEffect, useState, useCallback, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
  Navigate,
} from 'react-router-dom';
import { RoleNavigation, Role, UserRole } from './components/RoleNavigation';
import type { Order as RestaurantOrder } from './views/RestaurantView';
import { audioSynth } from './utils/audio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AddressProvider, useAddress } from './contexts/AddressContext';
import { CartProvider } from './contexts/CartContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { AddressModal } from './components/AddressModal';
import { UserHeader } from './components/UserHeader';
import { apiFetch } from './utils/api';

// Views principais 
const CustomerView = React.lazy(() =>
  import('./views/CustomerView').then((m) => ({ default: m.CustomerView })),
);
const MarketplaceView = React.lazy(() =>
  import('./views/MarketplaceView').then((m) => ({ default: m.MarketplaceView })),
);
const RestaurantView = React.lazy(() =>
  import('./views/RestaurantView').then((m) => ({ default: m.RestaurantView })),
);
const DriverView = React.lazy(() =>
  import('./views/DriverView').then((m) => ({ default: m.DriverView })),
);
const OrderHistoryView = React.lazy(() =>
  import('./views/OrderHistoryView').then((m) => ({ default: m.OrderHistoryView })),
);
const MenuManagementView = React.lazy(() =>
  import('./views/MenuManagementView').then((m) => ({ default: m.MenuManagementView })),
);
const DashboardView = React.lazy(() =>
  import('./views/DashboardView').then((m) => ({ default: m.DashboardView })),
);

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

export const mapToBackendStatus = (status: OrderStatus): string => {
  if (status === 'READY') return 'READY_FOR_PICKUP';
  if (status === 'ON_THE_WAY') return 'IN_TRANSIT';
  return status;
};

export const mapToFrontendStatus = (status: string): OrderStatus => {
  if (status === 'READY_FOR_PICKUP') return 'READY';
  if (status === 'IN_TRANSIT' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY')
    return 'ON_THE_WAY';
  return status as OrderStatus;
};

/**
 * STATUS → MENSAGEM TOAST
 * Lookup table limpa para mensagens de transição
 */
const statusToastMessages: Record<
  string,
  { title: string; message: string; type: 'success' | 'info' | 'warning' }
> = {
  PENDING: {
    title: 'Pedido Enviado!',
    message: 'Aguardando confirmação do restaurante.',
    type: 'info',
  },
  PREPARING: {
    title: 'Pedido Aceito!',
    message: 'O restaurante começou a preparar seu prato.',
    type: 'success',
  },
  READY: {
    title: 'Pedido Pronto!',
    message: 'Aguardando o entregador coletar.',
    type: 'info',
  },
  ON_THE_WAY: {
    title: 'Saiu para Entrega!',
    message: 'O entregador está a caminho.',
    type: 'success',
  },
  DELIVERED: {
    title: 'Pedido Entregue!',
    message: 'Bom apetite! Avalie seu pedido.',
    type: 'success',
  },
};

const DEFAULT_ROLE_MAP: Record<string, Role> = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_OWNER: 'RESTAURANT',
  DRIVER: 'DRIVER',
  ADMIN: 'RESTAURANT',
};


const ViewLoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-fadeIn py-4">
    <div className="h-9 bg-zinc-200/70 rounded-2xl animate-pulse w-48" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-44 bg-zinc-200/70 rounded-3xl animate-pulse" />
      <div className="h-44 bg-zinc-200/70 rounded-3xl animate-pulse" />
      <div className="h-44 bg-zinc-200/70 rounded-3xl animate-pulse" />
    </div>
    <div className="h-60 bg-zinc-200/70 rounded-3xl animate-pulse" />
  </div>
);

/** Subcomponente que resolve se exibe Marketplace ou Menu do Restaurante */
interface CustomerRouteWrapperProps {
  connected: boolean;
  activeCustomerOrder?: RestaurantOrder;
  driverLocation: any;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
  onCreateOrder: (
    items: Array<{ menuItemId: string; quantity: number }>,
    notes?: string,
  ) => Promise<void>;
  isLoading: boolean;
  onResetOrder: () => void;
  restaurantId: string | null;
  setRestaurantId: (id: string | null) => void;
}

const CustomerRouteWrapper: React.FC<CustomerRouteWrapperProps> = ({
  connected,
  activeCustomerOrder,
  driverLocation,
  restaurantLocation,
  customerLocation,
  onCreateOrder,
  isLoading,
  onResetOrder,
  restaurantId,
  setRestaurantId,
}) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const effectiveRestaurantId = id || activeCustomerOrder?.restaurantId || restaurantId;

  if (!effectiveRestaurantId && !activeCustomerOrder) {
    return (
      <MarketplaceView
        onSelectRestaurant={(selectedId) => {
          setRestaurantId(selectedId);
          navigate(`/restaurante/${selectedId}`);
        }}
      />
    );
  }

  return (
    <CustomerView
      socketConnected={connected}
      orderStatus={activeCustomerOrder?.status || null}
      activeOrder={activeCustomerOrder}
      driverLocation={driverLocation}
      restaurantLocation={restaurantLocation}
      customerLocation={customerLocation}
      onCreateOrder={onCreateOrder}
      isLoading={isLoading}
      onResetOrder={() => {
        onResetOrder();
        navigate('/');
      }}
      restaurantId={effectiveRestaurantId}
    />
  );
};

function AppContent() {
  const { user, isAuthenticated, quickLogin } = useAuth();
  const { addToast } = useToast();
  const { address } = useAddress();
  const location = useLocation();
  const navigate = useNavigate();

  // SocketContext desacoplado
  const { ordersSocket, deliverySocket, connected, joinOrderRoom, joinRestaurantRoom } =
    useSocket();

  const [currentRole, setCurrentRole] = useState<Role>('CUSTOMER');

  // Pedidos e Telemetria
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Coordenadas fixas do Restaurante (Praça Cel. José Vieira - Centro)
  const RESTAURANT_LOC = { lat: -22.5538, lng: -45.7796 };
  // Coordenadas reais dinâmicas do Cliente (ViaCEP / OpenStreetMap)
  const customerLoc = { lat: address.lat, lng: address.lng };

  // Sincroniza tab ativa com a rota URL
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/pedidos')) {
      setCurrentRole('HISTORY');
    } else if (path.startsWith('/kds')) {
      setCurrentRole('RESTAURANT');
    } else if (path.startsWith('/gestao')) {
      setCurrentRole('MANAGEMENT');
    } else if (path.startsWith('/dashboard')) {
      setCurrentRole('DASHBOARD');
    } else if (path.startsWith('/entregas')) {
      setCurrentRole('DRIVER');
    } else {
      setCurrentRole('CUSTOMER');
    }
  }, [location.pathname]);

  // Auto-select role ao logar caso esteja na raiz
  useEffect(() => {
    if (user) {
      const defaultRole = DEFAULT_ROLE_MAP[user.role] || 'CUSTOMER';
      setCurrentRole(defaultRole);
      if (location.pathname === '/') {
        if (defaultRole === 'RESTAURANT') navigate('/kds');
        else if (defaultRole === 'DRIVER') navigate('/entregas');
      }
    }
  }, [user]);

  // Carrega restaurantId baseado no perfil do usuário
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        if (user?.role === 'RESTAURANT_OWNER') {
          const restaurant = await apiFetch<any>('/api/v1/restaurants/my/restaurant');
          if (restaurant?.id) {
            setRestaurantId(restaurant.id);
          }
        } else if (user?.role === 'DRIVER' || user?.role === 'ADMIN') {
          const restaurants = await apiFetch<any[]>('/api/v1/restaurants');
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            setRestaurantId(restaurants[0].id);
          }
        }
      } catch (err) {
        console.log('Erro ao buscar restaurantId:', err);
      }
    };

    fetchRestaurantId();
  }, [user]);

  // Carrega pedidos:
  // - Se for DRIVER: busca todas as entregas disponíveis (/api/v1/orders/available-deliveries)
  // - Se for RESTAURANT / KDS: busca os pedidos do restaurante específico
  useEffect(() => {
    if (currentRole === 'DRIVER' || user?.role === 'DRIVER') {
      apiFetch<any[]>('/api/v1/orders/available-deliveries')
        .then((data) => {
          if (Array.isArray(data)) {
            const loaded: RestaurantOrder[] = data.map((d) => ({
              id: d.id,
              status: mapToFrontendStatus(d.status),
              createdAt: d.createdAt,
              totalPrice: d.totalPrice,
              notes: d.notes,
              restaurantId: d.restaurantId,
              customer: d.customer,
              items: d.items,
              restaurant: d.restaurant,
            }));
            setOrders(loaded);
          }
        })
        .catch((err) => console.log('Histórico de entregas disponíveis:', err));
      return;
    }

    if (!restaurantId) return;

    apiFetch<any[]>(`/api/v1/orders/restaurant/${restaurantId}`)
      .then((data) => {
        if (Array.isArray(data)) {
          const loaded: RestaurantOrder[] = data.map((d) => ({
            id: d.id,
            status: mapToFrontendStatus(d.status),
            createdAt: d.createdAt,
            totalPrice: d.totalPrice,
            notes: d.notes,
            restaurantId: d.restaurantId,
            customer: d.customer,
            items: d.items,
            restaurant: d.restaurant,
          }));
          setOrders(loaded);
        }
      })
      .catch((err) => console.log('Histórico inicial:', err));
  }, [restaurantId, currentRole, user]);

  // Listeners de eventos de WebSocket
  useEffect(() => {
    if (!ordersSocket || !deliverySocket) return;

    const handleNewOrder = (order: any) => {
      const formattedOrder: RestaurantOrder = {
        id: order.id,
        status: mapToFrontendStatus(order.status || 'PENDING'),
        createdAt: order.createdAt || new Date().toISOString(),
        totalPrice: order.totalPrice,
        notes: order.notes,
        restaurantId: order.restaurantId,
        customer: order.customer,
        items: order.items,
      };

      setOrders((prev) => {
        if (prev.some((o) => o.id === formattedOrder.id)) return prev;
        return [formattedOrder, ...prev];
      });

      setCurrentOrderId((prev) => prev || formattedOrder.id);

      addToast({
        type: 'warning',
        title: 'Novo Pedido Recebido!',
        message: `Cliente ${order.customer?.name || 'App'} fez um pedido.`,
      });
    };

    ordersSocket.on('newOrder', handleNewOrder);
    ordersSocket.on('orderCreated', handleNewOrder);

    const handleStatusChanged = (data: { orderId: string; status: OrderStatus | string }) => {
      const frontendStatus = mapToFrontendStatus(data.status);
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.orderId);
        if (exists) {
          return prev.map((o) => (o.id === data.orderId ? { ...o, status: frontendStatus } : o));
        }

        if (frontendStatus === 'READY') {
          apiFetch<any>(`/api/v1/orders/${data.orderId}`)
            .then((newOrd) => {
              if (newOrd) {
                const formatted: RestaurantOrder = {
                  id: newOrd.id,
                  status: frontendStatus,
                  createdAt: newOrd.createdAt,
                  totalPrice: newOrd.totalPrice,
                  notes: newOrd.notes,
                  restaurantId: newOrd.restaurantId,
                  customer: newOrd.customer,
                  items: newOrd.items,
                  restaurant: newOrd.restaurant,
                };
                setOrders((current) => [
                  formatted,
                  ...current.filter((o) => o.id !== formatted.id),
                ]);
              }
            })
            .catch((err) => console.log('Erro ao carregar detalhes do novo pedido pronto:', err));
        }
        return prev;
      });

      const toastConfig = statusToastMessages[frontendStatus];
      if (toastConfig) {
        addToast(toastConfig);
      }

      if (frontendStatus !== 'PENDING') {
        audioSynth.playSuccessSound();
      }

      if (frontendStatus === 'ON_THE_WAY') {
        joinOrderRoom(data.orderId);
        window.dispatchEvent(new CustomEvent('map:start-simulation'));
      }

      window.dispatchEvent(
        new CustomEvent('order:status-changed', {
          detail: { orderId: data.orderId, status: data.status, frontendStatus },
        }),
      );
    };

    ordersSocket.on('orderStatusChanged', handleStatusChanged);

    const handleLocationUpdate = (data: any) => {
      setDriverLocation({
        lat: data.lat,
        lng: data.lng,
        stepIndex: data.stepIndex,
        totalSteps: data.totalSteps,
        progressPercent: data.progressPercent,
        isArrived: data.isArrived,
        streetName: data.streetName,
        timestamp: data.timestamp,
      });

      if (data.isArrived) {
        window.dispatchEvent(new CustomEvent('driver:arrived', { detail: data }));
      }
    };

    deliverySocket.on('driverLocationUpdate', handleLocationUpdate);
    deliverySocket.on('locationUpdate', handleLocationUpdate);

    const handleDriverArrived = (data: { orderId: string }) => {
      window.dispatchEvent(new CustomEvent('driver:arrived', { detail: data }));
      addToast({
        type: 'success',
        title: 'Entregador no Local!',
        message: 'O entregador chegou ao endereço com o pedido.',
        duration: 8000,
      });
      audioSynth.playNotificationSound();
    };

    deliverySocket.on('driverArrived', handleDriverArrived);

    const handleDeliveryComplete = () => {
      setDriverLocation(null);
      audioSynth.playSuccessSound();
    };

    deliverySocket.on('deliveryComplete', handleDeliveryComplete);

    return () => {
      ordersSocket.off('newOrder', handleNewOrder);
      ordersSocket.off('orderCreated', handleNewOrder);
      ordersSocket.off('orderStatusChanged', handleStatusChanged);
      deliverySocket.off('driverLocationUpdate', handleLocationUpdate);
      deliverySocket.off('locationUpdate', handleLocationUpdate);
      deliverySocket.off('driverArrived', handleDriverArrived);
      deliverySocket.off('deliveryComplete', handleDeliveryComplete);
    };
  }, [ordersSocket, deliverySocket]);

  // Entrar nas rooms quando IDs mudarem
  useEffect(() => {
    if (restaurantId) {
      joinRestaurantRoom(restaurantId);
    }
  }, [restaurantId, joinRestaurantRoom]);

  useEffect(() => {
    if (currentOrderId) {
      joinOrderRoom(currentOrderId);
    }
  }, [currentOrderId, joinOrderRoom]);

  // Entrar automaticamente na room de entrega quando houver corrida ativa ou pronta
  useEffect(() => {
    const activeDel = orders.find((o) => o.status === 'ON_THE_WAY' || o.status === 'READY');
    if (activeDel) {
      joinOrderRoom(activeDel.id);
    }
  }, [orders, joinOrderRoom]);

  // Criar pedido
  const handleCreateOrder = async (
    items: Array<{ menuItemId: string; quantity: number }>,
    notes?: string,
  ) => {
    if (!restaurantId) {
      addToast({
        type: 'error',
        title: 'Restaurante não encontrado',
        message: 'Não foi possível identificar o restaurante. Recarregue a página.',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        await quickLogin('CUSTOMER');
      }

      const addressHeader = `[Entrega: ${address.formattedAddress} | GPS:${address.lat},${address.lng}]`;
      const combinedNotes = notes ? `${addressHeader} • Obs: ${notes}` : addressHeader;

      const data = await apiFetch<any>('/api/v1/orders', {
        method: 'POST',
        data: {
          restaurantId,
          items,
          notes: combinedNotes,
        },
      });

      const newOrder: RestaurantOrder = {
        id: data.id,
        status: data.status || 'PENDING',
        createdAt: data.createdAt || new Date().toISOString(),
        totalPrice: data.totalPrice,
        notes: data.notes,
        restaurantId: data.restaurantId || restaurantId,
        customer:
          data.customer ||
          (user ? { id: user.id, name: user.name, phone: user.phone } : undefined),
        items: data.items,
      };

      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      setCurrentOrderId(data.id);
      joinOrderRoom(data.id);

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
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    const backendStatus = mapToBackendStatus(status);

    try {
      await apiFetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        data: { status: backendStatus },
      });
    } catch (error: any) {
      console.error(`Erro ao persistir status do pedido ${orderId} via REST:`, error);
      if (ordersSocket) {
        ordersSocket.emit('updateOrderStatus', { orderId, status: backendStatus });
      }
    }
  };

  // Aceitar entrega
  const handleAcceptDelivery = async (orderId: string) => {
    joinOrderRoom(orderId);
    await handleUpdateStatus(orderId, 'ON_THE_WAY');

    addToast({
      type: 'success',
      title: 'Corrida Aceita!',
      message: 'Navegue até o restaurante para coletar o pedido.',
    });

    window.dispatchEvent(new CustomEvent('map:start-simulation'));

    try {
      await apiFetch(`/api/v1/delivery/simulate-trip/${orderId}`, { method: 'POST' });
    } catch (error) {
      console.error('Erro ao iniciar simulação de entrega', error);
    }
  };

  // Finalizar entrega
  const handleCompleteDelivery = async (orderId: string) => {
    await handleUpdateStatus(orderId, 'DELIVERED');
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
  const userRole: UserRole = (user?.role as UserRole) || null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-3 md:p-6 font-sans antialiased selection:bg-brand-500 selection:text-white relative">
      <div className="max-w-6xl mx-auto">
        <UserHeader />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <RoleNavigation
            currentRole={currentRole}
            onChangeRole={setCurrentRole}
            pendingOrdersCount={pendingCount}
            userRole={userRole}
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

        {/* Rotas SPA com React.lazy e Suspense */}
        <main>
          <Suspense fallback={<ViewLoadingSkeleton />}>
            <Routes>
              <Route
                path="/"
                element={
                  <CustomerRouteWrapper
                    connected={connected}
                    activeCustomerOrder={activeCustomerOrder}
                    driverLocation={driverLocation}
                    restaurantLocation={RESTAURANT_LOC}
                    customerLocation={customerLoc}
                    onCreateOrder={handleCreateOrder}
                    isLoading={isLoading}
                    onResetOrder={() => {
                      setCurrentOrderId(null);
                      setRestaurantId(null);
                    }}
                    restaurantId={restaurantId}
                    setRestaurantId={setRestaurantId}
                  />
                }
              />
              <Route
                path="/restaurante/:id"
                element={
                  <CustomerRouteWrapper
                    connected={connected}
                    activeCustomerOrder={activeCustomerOrder}
                    driverLocation={driverLocation}
                    restaurantLocation={RESTAURANT_LOC}
                    customerLocation={customerLoc}
                    onCreateOrder={handleCreateOrder}
                    isLoading={isLoading}
                    onResetOrder={() => {
                      setCurrentOrderId(null);
                      setRestaurantId(null);
                    }}
                    restaurantId={restaurantId}
                    setRestaurantId={setRestaurantId}
                  />
                }
              />
              <Route path="/pedidos" element={<OrderHistoryView />} />
              <Route
                path="/kds"
                element={
                  <RestaurantView
                    orders={orders}
                    onUpdateStatus={handleUpdateStatus}
                    onClearOrders={handleClearOrders}
                  />
                }
              />
              <Route
                path="/gestao"
                element={<MenuManagementView restaurantId={restaurantId} />}
              />
              <Route
                path="/dashboard"
                element={<DashboardView restaurantId={restaurantId} />}
              />
              <Route
                path="/entregas"
                element={
                  <DriverView
                    orders={orders}
                    onAcceptDelivery={handleAcceptDelivery}
                    onCompleteDelivery={handleCompleteDelivery}
                    driverLocation={driverLocation}
                    restaurantLocation={RESTAURANT_LOC}
                    customerLocation={customerLoc}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/**
 * CONCEITO: Composição de Providers com React Router
 *
 * BrowserRouter > AuthProvider > ToastProvider > AddressProvider > CartProvider > SocketProvider
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AddressProvider>
            <CartProvider>
              <SocketProvider>
                <AppContent />
                <AddressModal />
              </SocketProvider>
            </CartProvider>
          </AddressProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
