import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleNavigation, Role, UserRole } from './components/RoleNavigation';
import { CustomerView } from './views/CustomerView';
import { RestaurantView, Order as RestaurantOrder } from './views/RestaurantView';
import { DriverView } from './views/DriverView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { MenuManagementView } from './views/MenuManagementView';
import { DashboardView } from './views/DashboardView';
import { MarketplaceView } from './views/MarketplaceView';
import { audioSynth } from './utils/audio';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AddressProvider, useAddress } from './contexts/AddressContext';
import { AddressModal } from './components/AddressModal';
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
  const [driverLocation, setDriverLocation] = useState<any | null>(null);
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

  const { address } = useAddress();
  // Coordenadas fixas do Restaurante (Praça Cel. José Vieira - Centro)
  const RESTAURANT_LOC = { lat: -22.5538, lng: -45.7796 };
  // Coordenadas reais dinâmicas do Cliente (ViaCEP / OpenStreetMap)
  const customerLoc = { lat: address.lat, lng: address.lng };

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
        } else if (user?.role === 'DRIVER' || user?.role === 'ADMIN') {
          // por enquanto usa o primeiro restaurante para a fila
          const restaurants = await apiFetch<any[]>('/api/v1/restaurants');
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            setRestaurantId(restaurants[0].id);
          }
        }
        // não auto-seleciona, pois verá o MarketplaceView primeiro
      } catch (err) {
        console.log('Erro ao buscar restaurantId:', err);
      }
    };

    fetchRestaurantId();
  }, [user]);

  // Carregar pedidos:
  // - Se for DRIVER: busca todas as entregas disponíveis na cidade (/api/v1/orders/available-deliveries)
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

  // Conexão e sincronização com WebSocket
  useEffect(() => {
    const socketOptions = token ? { auth: { token } } : {};
    const ordSocket = io(`${API_BASE_URL}/orders`, socketOptions);
    const dlvSocket = io(`${API_BASE_URL}/delivery`, socketOptions);

    setOrdersSocket(ordSocket);
    setDeliverySocket(dlvSocket);

    ordSocket.on('connect', () => {
      setConnected(true);
      if (restaurantId) {
        ordSocket.emit('joinRestaurantRoom', { restaurantId });
      }
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
        restaurantId: order.restaurantId,
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
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.orderId);
        if (exists) {
          return prev.map((o) => (o.id === data.orderId ? { ...o, status: frontendStatus } : o));
        }

        // Se o pedido não estava na lista (ex: nova entrega pronta no app do motorista), busca dados completos e insere
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
                setOrders((current) => [formatted, ...current.filter((o) => o.id !== formatted.id)]);
              }
            })
            .catch((err) => console.log('Erro ao carregar detalhes do novo pedido pronto:', err));
        }
        return prev;
      });

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

    // Telemetria do entregador (GPS em Ruas Reais com OSRM)
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

    dlvSocket.on('driverLocationUpdate', handleLocationUpdate);
    dlvSocket.on('locationUpdate', handleLocationUpdate);

    dlvSocket.on('driverArrived', (data: { orderId: string }) => {
      window.dispatchEvent(new CustomEvent('driver:arrived', { detail: data }));
      addToast({
        type: 'success',
        title: 'Entregador no Local!',
        message: 'O entregador chegou ao endereço com o pedido.',
        duration: 8000,
      });
      audioSynth.playNotificationSound();
    });

    dlvSocket.on('deliveryComplete', () => {
      setDriverLocation(null);
      audioSynth.playSuccessSound();
    });

    return () => {
      ordSocket.disconnect();
      dlvSocket.disconnect();
      setConnected(false);
    };
  }, [token]);

  // Entrar na room do restaurante quando restaurantId mudar
  useEffect(() => {
    if (ordersSocket && connected && restaurantId) {
      ordersSocket.emit('joinRestaurantRoom', { restaurantId });
    }
  }, [ordersSocket, connected, restaurantId]);

  // Entrar na room do pedido quando currentOrderId mudar
  useEffect(() => {
    if (ordersSocket && connected && currentOrderId) {
      ordersSocket.emit('joinOrderRoom', { orderId: currentOrderId });
      deliverySocket?.emit('joinDeliveryRoom', { orderId: currentOrderId });
    }
  }, [ordersSocket, deliverySocket, connected, currentOrderId]);

  // Entrar na room de entrega quando houver corrida ativa
  useEffect(() => {
    const activeDel = orders.find((o) => o.status === 'ON_THE_WAY' || o.status === 'READY');
    if (deliverySocket && connected && activeDel) {
      deliverySocket.emit('joinDeliveryRoom', { orderId: activeDel.id });
    }
  }, [orders, deliverySocket, connected]);

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

    // Inicia simulação visual no mapa imediatamente
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
          {currentRole === 'CUSTOMER' && !restaurantId && !activeCustomerOrder && (
            <MarketplaceView onSelectRestaurant={(id) => setRestaurantId(id)} />
          )}

          {currentRole === 'CUSTOMER' && (restaurantId || activeCustomerOrder) && (
            <CustomerView
              socketConnected={connected}
              orderStatus={activeCustomerOrder?.status || null}
              activeOrder={activeCustomerOrder}
              driverLocation={driverLocation}
              restaurantLocation={RESTAURANT_LOC}
              customerLocation={customerLoc}
              onCreateOrder={handleCreateOrder}
              isLoading={isLoading}
              onResetOrder={() => {
                setCurrentOrderId(null);
                setRestaurantId(null);
              }}
              restaurantId={activeCustomerOrder?.restaurantId || restaurantId}
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
              customerLocation={customerLoc}
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
 * AuthProvider > ToastProvider > AddressProvider > AppContent + AddressModal
 */
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AddressProvider>
          <AppContent />
          <AddressModal />
        </AddressProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
