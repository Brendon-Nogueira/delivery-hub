import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from './AuthContext';

interface SocketContextData {
  ordersSocket: Socket | null;
  deliverySocket: Socket | null;
  connected: boolean;
  joinOrderRoom: (orderId: string) => void;
  joinRestaurantRoom: (restaurantId: string) => void;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [ordersSocket, setOrdersSocket] = useState<Socket | null>(null);
  const [deliverySocket, setDeliverySocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketOptions = token ? { auth: { token } } : {};
    const ordSocket = io(`${API_BASE_URL}/orders`, {
      ...socketOptions,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const dlvSocket = io(`${API_BASE_URL}/delivery`, {
      ...socketOptions,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    ordSocket.on('connect', () => {
      setConnected(true);
    });

    ordSocket.on('disconnect', () => {
      setConnected(false);
    });

    setOrdersSocket(ordSocket);
    setDeliverySocket(dlvSocket);

    return () => {
      ordSocket.disconnect();
      dlvSocket.disconnect();
    };
  }, [token]);

  const joinedRoomsRef = React.useRef<{ orders: Set<string>; restaurants: Set<string> }>({
    orders: new Set(),
    restaurants: new Set(),
  });

  useEffect(() => {
    if (ordersSocket && connected) {
      joinedRoomsRef.current.orders.forEach((orderId) => {
        ordersSocket.emit('joinOrderRoom', { orderId });
      });
      joinedRoomsRef.current.restaurants.forEach((restaurantId) => {
        ordersSocket.emit('joinRestaurantRoom', { restaurantId });
      });
    }
    if (deliverySocket && connected) {
      joinedRoomsRef.current.orders.forEach((orderId) => {
        deliverySocket.emit('joinDeliveryRoom', { orderId });
      });
    }
  }, [connected, ordersSocket, deliverySocket]);

  const joinOrderRoom = useCallback(
    (orderId: string) => {
      joinedRoomsRef.current.orders.add(orderId);
      if (ordersSocket && ordersSocket.connected) {
        ordersSocket.emit('joinOrderRoom', { orderId });
      }
      if (deliverySocket && deliverySocket.connected) {
        deliverySocket.emit('joinDeliveryRoom', { orderId });
      }
    },
    [ordersSocket, deliverySocket],
  );

  const joinRestaurantRoom = useCallback(
    (restaurantId: string) => {
      joinedRoomsRef.current.restaurants.add(restaurantId);
      if (ordersSocket && ordersSocket.connected) {
        ordersSocket.emit('joinRestaurantRoom', { restaurantId });
      }
    },
    [ordersSocket],
  );

  return (
    <SocketContext.Provider
      value={{
        ordersSocket,
        deliverySocket,
        connected,
        joinOrderRoom,
        joinRestaurantRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser utilizado dentro de um SocketProvider');
  }
  return context;
};
