import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MenuItem } from '../components/MenuItemCard';
import { useToast } from './ToastContext';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartStorageData {
  cart: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  notes: string;
  paymentMethod: 'PIX' | 'CARTAO' | 'DINHEIRO';
}

interface CartContextData {
  cart: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  notes: string;
  setNotes: (notes: string) => void;
  paymentMethod: 'PIX' | 'CARTAO' | 'DINHEIRO';
  setPaymentMethod: (method: 'PIX' | 'CARTAO' | 'DINHEIRO') => void;
  totalCount: number;
  subtotal: number;
  totalPrice: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addToCart: (
    item: MenuItem,
    restaurantInfo?: { id: string; name: string; deliveryFee?: number },
  ) => boolean;
  removeFromCart: (item: MenuItem) => void;
  clearItem: (itemId: string) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = '@deliveryhub:cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();

  // Carrega estado inicial do localStorage 
  const [cartState, setCartState] = useState<CartStorageData>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Falha ao restaurar carrinho do localStorage:', e);
    }
    return {
      cart: [],
      restaurantId: null,
      restaurantName: null,
      deliveryFee: 5.0,
      notes: '',
      paymentMethod: 'PIX',
    };
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sincroniza estado com o localStorage sempre que o carrinho for modificado
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
    } catch (e) {
      console.error('Falha ao salvar carrinho no localStorage:', e);
    }
  }, [cartState]);

  const totalCount = useMemo(() => {
    return cartState.cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartState.cart]);

  const subtotal = useMemo(() => {
    return cartState.cart.reduce((sum, i) => {
      const price = typeof i.item.price === 'string' ? parseFloat(i.item.price) : Number(i.item.price || 0);
      return sum + price * i.quantity;
    }, 0);
  }, [cartState.cart]);

  const totalPrice = useMemo(() => {
    return subtotal > 0 ? subtotal + cartState.deliveryFee : 0;
  }, [subtotal, cartState.deliveryFee]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const setNotes = (notes: string) => {
    setCartState((prev) => ({ ...prev, notes }));
  };

  const setPaymentMethod = (paymentMethod: 'PIX' | 'CARTAO' | 'DINHEIRO') => {
    setCartState((prev) => ({ ...prev, paymentMethod }));
  };

  const clearCart = () => {
    setCartState({
      cart: [],
      restaurantId: null,
      restaurantName: null,
      deliveryFee: 5.0,
      notes: '',
      paymentMethod: 'PIX',
    });
  };

  const clearItem = (itemId: string) => {
    setCartState((prev) => {
      const updated = prev.cart.filter((c) => c.item.id !== itemId);
      return {
        ...prev,
        cart: updated,
        ...(updated.length === 0 ? { restaurantId: null, restaurantName: null } : {}),
      };
    });
  };

  const addToCart = (
    item: MenuItem,
    restaurantInfo?: { id: string; name: string; deliveryFee?: number },
  ): boolean => {
    // Validação multi-loja: impede misturar produtos de lojas distintas sem consentimento
    if (
      restaurantInfo &&
      cartState.restaurantId &&
      cartState.restaurantId !== restaurantInfo.id &&
      cartState.cart.length > 0
    ) {
      const confirmChange = window.confirm(
        `Sua sacola já contém itens de "${cartState.restaurantName || 'outro restaurante'}". Deseja esvaziá-la para iniciar um novo pedido em "${restaurantInfo.name}"?`,
      );

      if (!confirmChange) {
        return false;
      }

      // Limpa e inicia com a nova loja
      setCartState({
        cart: [{ item, quantity: 1 }],
        restaurantId: restaurantInfo.id,
        restaurantName: restaurantInfo.name,
        deliveryFee: restaurantInfo.deliveryFee ?? 5.0,
        notes: '',
        paymentMethod: 'PIX',
      });

      addToast({
        type: 'info',
        title: 'Nova Sacola Iniciada',
        message: `Itens de ${restaurantInfo.name} adicionados.`,
      });

      return true;
    }

    setCartState((prev) => {
      const existing = prev.cart.find((c) => c.item.id === item.id);
      let updatedCart: CartItem[];

      if (existing) {
        updatedCart = prev.cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      } else {
        updatedCart = [...prev.cart, { item, quantity: 1 }];
      }

      return {
        ...prev,
        cart: updatedCart,
        restaurantId: restaurantInfo?.id || prev.restaurantId,
        restaurantName: restaurantInfo?.name || prev.restaurantName,
        deliveryFee: restaurantInfo?.deliveryFee !== undefined ? restaurantInfo.deliveryFee : prev.deliveryFee,
      };
    });

    return true;
  };

  const removeFromCart = (item: MenuItem) => {
    setCartState((prev) => {
      const existing = prev.cart.find((c) => c.item.id === item.id);
      if (!existing) return prev;

      let updatedCart: CartItem[];
      if (existing.quantity === 1) {
        updatedCart = prev.cart.filter((c) => c.item.id !== item.id);
      } else {
        updatedCart = prev.cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity - 1 } : c,
        );
      }

      return {
        ...prev,
        cart: updatedCart,
        ...(updatedCart.length === 0 ? { restaurantId: null, restaurantName: null } : {}),
      };
    });
  };

  return (
    <CartContext.Provider
      value={{
        cart: cartState.cart,
        restaurantId: cartState.restaurantId,
        restaurantName: cartState.restaurantName,
        deliveryFee: cartState.deliveryFee,
        notes: cartState.notes,
        setNotes,
        paymentMethod: cartState.paymentMethod,
        setPaymentMethod,
        totalCount,
        subtotal,
        totalPrice,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addToCart,
        removeFromCart,
        clearItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado dentro de um CartProvider');
  }
  return context;
};
