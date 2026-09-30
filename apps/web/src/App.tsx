import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleNavigation, Role, UserRole } from './components/RoleNavigation';
import { CustomerView } from './views/CustomerView';
import { RestaurantView, Order as RestaurantOrder } from './views/RestaurantView';
import { DriverView } from './views/DriverView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { MenuManagementView } from './views/MenuManagementView';
import { DashboardView } from './views/DashboardView';
import { audioSynth } from './utils/audio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserHeader } from './components/UserHeader';
import { apiFetch, API_BASE_URL } from './utils/api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

export const mapToBackendStatus = (status: OrderStatus): string => {
  if (status === 'READY') return 'READY_FOR_PICKUP';
  if (status === 'ON_THE_WAY') return 'IN_TRANSIT';
  return status;
};

export const mapToFrontendStatus = (status: string): OrderStatus => {
  if (status === 'READY_FOR_PICKUP') return 'READY';
  if (status === 'IN_TRANSIT' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') return 'ON_THE_WAY';
  return status as OrderStatus;
};

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

/**
 * CONCEITO: Mapeamento de Role do backend → Role default da navegação
 *
 * Quando o usuário faz login, ele é automaticamente direcionado para
 * a tab principal de sua role. Isso elimina a confusão de ver abas
 * que não pertencem ao seu perfil.
 */
const DEFAULT_ROLE_MAP: Record<string, Role> = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_OWNER: 'RESTAURANT',
  DRIVER: 'DRIVER',
  ADMIN: 'RESTAURANT',
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

  /**
   * CONCEITO: Restaurant ID 
   *
   * Antes: usávamos 'rest-123' hardcoded em todo lugar — uma falha de segurança.
   * Agora: o restaurantId é buscado dinamicamente do backend:
   *   - RESTAURANT_OWNER: GET /api/v1/restaurants/my/restaurant (owner logado)
   *   - CUSTOMER: GET /api/v1/restaurants (retorna lista, usa o primeiro disponível)
   *
   */
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Coordenadas fixas (Paraisópolis - MG)
  const RESTAURANT_LOC = { lat: -22.5538, lng: -45.7796 };
  const CUSTOMER_LOC = { lat: -22.548, lng: -45.775 };

  // Auto-select role por perfil do usuário
  useEffect(() => {
    if (user) {
      const defaultRole = DEFAULT_ROLE_MAP[user.role] || 'CUSTOMER';
      setCurrentRole(defaultRole);
    } else {
      setCurrentRole('CUSTOMER');
    }
  }, [user]);

  /**
   * CONCEITO: restaurantId
   *
   * Este useEffect substitui todos os 'rest-123' hardcoded.
   * - Se o usuário é RESTAURANT_OWNER: busca SEU restaurante
   * - Se é CUSTOMER ou outro: busca a lista pública de restaurantes
   *
   * O ID é armazenado em estado e propagado para todas as chamadas de API.
   */
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        if (user?.role === 'RESTAURANT_OWNER') {
          // Owner logado
          const restaurant = await apiFetch<any>('/api/v1/restaurants/my/restaurant');
          if (restaurant?.id) {
            setRestaurantId(restaurant.id);
          }
        } else {
          // Cliente/Entregador: busca a lista pública e usa o primeiro
          const restaurants = await apiFetch<any[]>('/api/v1/restaurants');
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            setRestaurantId(restaurants[0].id);
          }
        }
      } catch (err) {
        console.log('Erro ao buscar restaurantId:', err);
        // Fallback: se não conseguir buscar, tenta a lista pública
        try {
          const restaurants = await apiFetch<any[]>('/api/v1/restaurants');
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            setRestaurantId(restaurants[0].id);
          }
        } catch {
          console.error('Não foi possível obter nenhum restaurante');
        }
      }
    };

    fetchRestaurantId();
  }, [user]);

  // Carregar pedidos iniciais do restaurante (para a view KDS)
  useEffect(() => {
    if (!restaurantId) return;

    apiFetch<any[]>(`/api/v1/orders/restaurant/${restaurantId}`)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const loaded: RestaurantOrder[] = data.map((d) => ({
            id: d.id,
            status: mapToFrontendStatus(d.status),
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
  }, [restaurantId]);

  // Conexão e sincronização com WebSocket
  useEffect(() => {
    if (!restaurantId) return;

    const socketOptions = token ? { auth: { token } } : {};
    const ordSocket = io(`${API_BASE_URL}/orders`, socketOptions);
    const dlvSocket = io(`${API_BASE_URL}/delivery`, socketOptions);

    setOrdersSocket(ordSocket);
    setDeliverySocket(dlvSocket);

    ordSocket.on('connect', () => {
      setConnected(true);
      ordSocket.emit('joinRestaurantRoom', { restaurantId });
      if (currentOrderId) {
        ordSocket.emit('joinOrderRoom', { orderId: currentOrderId });
      }
    });

    ordSocket.on('disconnect', () => setConnected(false));

    // Novo pedido recebido
    const handleNewOrder = (order: any) => {
      const formattedOrder: RestaurantOrder = {
        id: order.id,
        status: mapToFrontendStatus(order.status || 'PENDING'),
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
    const handleStatusChanged = (data: { orderId: string; status: OrderStatus | string }) => {
      const frontendStatus = mapToFrontendStatus(data.status);
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: frontendStatus } : o))
      );

      // Toast de mudança de status
      const toastConfig = statusToastMessages[frontendStatus];
      if (toastConfig) {
        addToast(toastConfig);
      }

      if (frontendStatus !== 'PENDING') {
        audioSynth.playSuccessSound();
      }

      // Notifica componentes que escutam evento global (ex: OrderHistoryView)
      window.dispatchEvent(
        new CustomEvent('order:status-changed', {
          detail: { orderId: data.orderId, status: data.status, frontendStatus },
        })
      );
    };

    ordSocket.on('orderStatusChanged', handleStatusChanged);

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
  }, [token, currentOrderId, restaurantId]);

  // Criar pedido
  const handleCreateOrder = async (
    items: Array<{ menuItemId: string; quantity: number }>,
    notes?: string
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

      const data = await apiFetch<any>('/api/v1/orders', {
        method: 'POST',
        data: {
          restaurantId,
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
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    const backendStatus = mapToBackendStatus(status);


    // O backend (OrdersController) persiste no PostgreSQL e emite o WebSocket broadcast para todos
    try {
      await apiFetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        data: { status: backendStatus },
      });
    } catch (error: any) {
      console.error(`Erro ao persistir status do pedido ${orderId} via REST:`, error);
      // Fallback: se o REST falhar, tenta emitir via WebSocket diretamente
      if (ordersSocket) {
        ordersSocket.emit('updateOrderStatus', { orderId, status: backendStatus });
      }
    }
  };

  // Aceitar entrega
  const handleAcceptDelivery = async (orderId: string) => {
    await handleUpdateStatus(orderId, 'ON_THE_WAY');

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

  /** UserRole */
  const userRole: UserRole = user?.role as UserRole || null;

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
              restaurantId={restaurantId}
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

          {currentRole === 'MANAGEMENT' && (
            <MenuManagementView restaurantId={restaurantId} />
          )}

          {currentRole === 'DASHBOARD' && (
            <DashboardView restaurantId={restaurantId} />
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
