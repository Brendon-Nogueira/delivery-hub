import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoleNavigation, Role } from './components/RoleNavigation';
import { CustomerView } from './views/CustomerView';
import { RestaurantView } from './views/RestaurantView';
import { DriverView } from './views/DriverView';
import { audioSynth } from './utils/audio';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

const API_URL = 'http://localhost:4000';

function App() {
  const [currentRole, setCurrentRole] = useState<Role>('CUSTOMER');
  
  // Sockets
  const [ordersSocket, setOrdersSocket] = useState<Socket | null>(null);
  const [deliverySocket, setDeliverySocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
 
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Coordenadas fixas (Paraisópolis - MG)
  const RESTAURANT_LOC = { lat: -22.553800, lng: -45.779600 }; // Praça Cel. José Vieira
  const CUSTOMER_LOC = { lat: -22.548000, lng: -45.775000 }; // Um pouco afastado do centro

  //Carrega pedidos existentes 
  useEffect(() => {
    fetch(`${API_URL}/api/v1/orders/restaurant/rest-123`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const loaded: Order[] = data.map(d => ({
            id: d.id,
            status: d.status as OrderStatus,
            createdAt: d.createdAt
          }));
          setOrders(loaded);
          // Se não houver pedido ativo selecionado, seleciona o mais recente
          setCurrentOrderId(prev => prev || loaded[0].id);
        }
      })
      .catch(err => console.log('Histórico inicial:', err));
  }, []);

  useEffect(() => {
    // Conecta nos dois namespaces
    const ordSocket = io(`${API_URL}/orders`);
    const dlvSocket = io(`${API_URL}/delivery`);

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

    // Escuta evento emitido pelo OrdersGateway
    const handleNewOrder = (order: any) => {
      const formattedOrder: Order = {
        id: order.id,
        status: order.status || 'PENDING',
        createdAt: order.createdAt || new Date().toISOString()
      };
      setOrders(prev => {
        if (prev.some(o => o.id === formattedOrder.id)) return prev;
        return [formattedOrder, ...prev];
      });
      setCurrentOrderId(prev => prev || formattedOrder.id);
    };

    ordSocket.on('newOrder', handleNewOrder);
    ordSocket.on('orderCreated', handleNewOrder);

    // Escuta atualização de status
    const handleStatusChanged = (data: { orderId: string, status: OrderStatus }) => {
      setOrders(prev => prev.map(o => o.id === data.orderId ? { ...o, status: data.status } : o));
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
  }, [currentOrderId]);

  // Ações do Cliente
  const handleCreateOrder = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantId: 'rest-123',
          items: [
            { menuItemId: 'item-1', quantity: 1 }
          ],
          notes: 'Pedido Teste MVP'
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      const newOrder: Order = {
        id: data.id,
        status: data.status || 'PENDING',
        createdAt: data.createdAt || new Date().toISOString()
      };

      // Atualiza o estado local imediatamente para a tela avançar
      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
      setCurrentOrderId(data.id);

      // Entra na sala do pedido nos sockets
      ordersSocket?.emit('joinOrderRoom', { orderId: data.id });
      deliverySocket?.emit('joinDeliveryRoom', { orderId: data.id });

      audioSynth.playSuccessSound();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao criar pedido. Verifique a conexão com o backend.');
    } finally {
      setIsLoading(false);
    }
  };

  // Ações do Restaurante
  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (ordersSocket) {
      ordersSocket.emit('updateOrderStatus', { orderId, status });
    }
  };

  // Ações do Entregador
  const handleAcceptDelivery = async (orderId: string) => {
    handleUpdateStatus(orderId, 'ON_THE_WAY');
    
    // simulação de rota no backend
    try {
      await fetch(`${API_URL}/api/v1/delivery/simulate-trip/${orderId}`, { method: 'POST' });
    } catch (error) {
      console.error('Erro ao iniciar simulação de entrega', error);
    }
  };

  const handleCompleteDelivery = (orderId: string) => {
    handleUpdateStatus(orderId, 'DELIVERED');
    setDriverLocation(null);
    audioSynth.playSuccessSound();
  };

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            DeliveryHub MVP
          </h1>
          <p className="text-slate-400 mb-6">Plataforma Real-Time • Paraisópolis, MG</p>
          
          {/* Navegação */}
          <RoleNavigation 
            currentRole={currentRole} 
            onChangeRole={setCurrentRole} 
            pendingOrdersCount={pendingCount}
          />
        </header>

        {/* Status de Conexão WebSocket */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'Sistemas Conectados (WebSocket)' : 'Desconectado'}
          </div>
        </div>

        {/* View */}
        <main>
          {currentRole === 'CUSTOMER' && (
            <CustomerView
              socketConnected={connected}
              orderStatus={orders.find(o => o.id === currentOrderId)?.status || null}
              driverLocation={driverLocation}
              restaurantLocation={RESTAURANT_LOC}
              customerLocation={CUSTOMER_LOC}
              onCreateOrder={handleCreateOrder}
              isLoading={isLoading}
            />
          )}

          {currentRole === 'RESTAURANT' && (
            <RestaurantView
              orders={orders}
              onUpdateStatus={handleUpdateStatus}
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

export default App;
