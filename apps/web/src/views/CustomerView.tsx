import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Star,
  MapPin,
  Search,
  Bike,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { MenuItemCard, MenuItem } from '../components/MenuItemCard';
import { CartDrawer, CartItem } from '../components/CartDrawer';
import { MapTracker } from '../components/MapTracker';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useAddress } from '../contexts/AddressContext';
import { resolveOrderCoordinates } from '../services/geocodingService';
import { AuthModal } from '../components/AuthModal';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED';

interface CustomerViewProps {
  socketConnected: boolean;
  orderStatus: OrderStatus | null;
  activeOrder?: any;
  driverLocation: { lat: number; lng: number } | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
  onCreateOrder: (items: Array<{ menuItemId: string; quantity: number }>, notes?: string) => Promise<void>;
  isLoading: boolean;
  onResetOrder?: () => void;
  restaurantId: string | null;
}

const statusMessages: Record<OrderStatus, string> = {
  PENDING: 'Aguardando o restaurante confirmar seu pedido...',
  PREPARING: 'O restaurante está preparando seus pratos com carinho!',
  READY: 'Pedido pronto e embalado! Aguardando o entregador coletar...',
  ON_THE_WAY: 'O entregador está a caminho do seu endereço!',
  DELIVERED: 'Pedido entregue com sucesso! Bom apetite!',
};

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-500',
  PREPARING: 'bg-sky-500',
  READY: 'bg-indigo-500',
  ON_THE_WAY: 'bg-orange-500',
  DELIVERED: 'bg-emerald-500',
};

const DELIVERY_FEE = 5.0;

export const CustomerView: React.FC<CustomerViewProps> = ({
  socketConnected,
  orderStatus,
  activeOrder,
  driverLocation,
  restaurantLocation,
  customerLocation,
  onCreateOrder,
  isLoading,
  onResetOrder,
  restaurantId,
}) => {
  const { isAuthenticated, quickLogin } = useAuth();
  const { address } = useAddress();
  const [orderCoords, setOrderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Estados do Cardápio & Restaurante
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados do Carrinho & Drawer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARTAO' | 'DINHEIRO'>('PIX');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Resolução de endereço e coordenadas reais do pedido ativo
  useEffect(() => {
    if (activeOrder?.notes) {
      resolveOrderCoordinates(activeOrder.notes).then((coords) => setOrderCoords(coords));
    } else {
      setOrderCoords(null);
    }
  }, [activeOrder?.notes]);

  const extractDeliveryAddress = (notes?: string) => {
    if (!notes) return address.formattedAddress;
    const match = notes.match(/\[Entrega:\s*(.*?)(\s*\|\s*GPS:[^\]]*)?\]/);
    return match && match[1] ? match[1].trim() : address.formattedAddress;
  };

  const destinationAddress = extractDeliveryAddress(activeOrder?.notes);
  const destinationLocation = orderCoords || customerLocation;

  // Carregar dados do restaurante e cardápio
  useEffect(() => {
    if (!restaurantId) {
      setLoadingMenu(false);
      return;
    }

    let isMounted = true;
    setLoadingMenu(true);
    setMenuError(null);

    Promise.all([
      apiFetch<any>(`/api/v1/restaurants/${restaurantId}`),
      apiFetch<MenuItem[]>(`/api/v1/menu/restaurant/${restaurantId}`)
    ])
      .then(([restData, menuData]) => {
        if (isMounted) {
          setRestaurant(restData);
          if (Array.isArray(menuData) && menuData.length > 0) {
            setMenuItems(menuData);
          } else {
            setMenuItems([]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Erro ao buscar dados do restaurante:', err);
          setMenuError('Não foi possível carregar os pratos no momento.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingMenu(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Handlers do Carrinho
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((ci) => ci.item.id !== item.id);
      }
      return prev.map((ci) =>
        ci.item.id === item.id ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  const handleClearItem = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find((ci) => ci.item.id === itemId)?.quantity || 0;
  };

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = cart.reduce((acc, curr) => {
    const price = typeof curr.item.price === 'string' ? parseFloat(curr.item.price) : curr.item.price;
    return acc + price * curr.quantity;
  }, 0);

  const deliveryFee = restaurant ? Number(restaurant.deliveryFee) : 5.0;
  const grandTotal = subtotal > 0 ? subtotal + deliveryFee : 0;

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    const payloadItems = cart.map((ci) => ({
      menuItemId: ci.item.id,
      quantity: ci.quantity,
    }));

    await onCreateOrder(payloadItems, notes.trim() || undefined);
    setCart([]);
    setIsDrawerOpen(false);
  };

  // Categorias Dinâmicas
  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((m) => m.category)));
    return ['Todos', ...unique];
  }, [menuItems]);

  // Filtragem combinada: Categoria + Busca por texto
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Todos' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Se houver pedido ativo, exibe a tela de rastreamento com mapa e status
  if (orderStatus) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-card border border-zinc-200/60">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-200 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Rastreamento em Tempo Real
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
                {restaurant?.name || 'Restaurante Parceiro'}
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>Destino: {destinationAddress}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 bg-zinc-50 text-zinc-600 shadow-sm">
                Pedido #{activeOrder?.id?.slice(0, 8) || 'Ativo'}
              </span>
            </div>
          </div>

          {/* Banner do Status Atual */}
          <div className="p-5 rounded-2xl border border-zinc-200/60 bg-zinc-50 mb-8 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-3.5 h-3.5 rounded-full ${statusColors[orderStatus]}`} />
                <div className={`absolute inset-0 rounded-full ${statusColors[orderStatus]} animate-ping opacity-75`} />
              </div>
              <h3 className="text-base font-black text-zinc-900 tracking-wide">
                {orderStatus === 'PENDING' && 'Pedido Enviado para a Cozinha'}
                {orderStatus === 'PREPARING' && 'Cozinha Preparando Seu Prato'}
                {orderStatus === 'READY' && 'Pronto! Aguardando o Entregador'}
                {orderStatus === 'ON_THE_WAY' && 'Entregador em Rota até Você'}
                {orderStatus === 'DELIVERED' && 'Pedido Entregue com Sucesso'}
              </h3>
            </div>
            <p className="mt-2 text-zinc-500 text-xs font-medium leading-relaxed">{statusMessages[orderStatus]}</p>
          </div>

          {/* Stepper Visual */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-8">
            {(['PENDING', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED'] as OrderStatus[]).map(
              (step) => {
                const stepsArray = ['PENDING', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED'];
                const stepIdx = stepsArray.indexOf(step);
                const currentIdx = stepsArray.indexOf(orderStatus);
                const isActive = step === orderStatus;
                const isPast = stepIdx < currentIdx;

                const stepLabels: Record<OrderStatus, string> = {
                  PENDING: 'Pendente',
                  PREPARING: 'Preparo',
                  READY: 'Pronto',
                  ON_THE_WAY: 'A Caminho',
                  DELIVERED: 'Entregue',
                };

                return (
                  <div
                    key={step}
                    className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-all ${
                      isActive
                        ? 'border-orange-300 bg-orange-50 text-zinc-900 shadow-sm'
                        : isPast
                        ? 'border-emerald-200 bg-emerald-50 text-zinc-700'
                        : 'border-zinc-200/60 bg-zinc-50 text-zinc-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black mb-2 transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm scale-110'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : stepIdx + 1}
                    </div>
                    <span className="text-xs font-bold">{stepLabels[step]}</span>
                  </div>
                );
              }
            )}
          </div>

          {/* Mapa do Leaflet */}
          <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-sm h-[380px] mb-6">
            <MapTracker
              restaurantLocation={{
                lat: restaurant?.latitude || restaurantLocation.lat,
                lng: restaurant?.longitude || restaurantLocation.lng,
              }}
              customerLocation={destinationLocation}
              driverLocation={driverLocation}
              orderStatus={orderStatus}
              customerAddressName={destinationAddress}
              restaurantName={restaurant?.name || 'Restaurante'}
            />
          </div>

          {/* Ações pós-entrega ou retorno */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              {orderStatus === 'DELIVERED'
                ? 'Seu pedido foi entregue. Obrigado pela preferência!'
                : 'Atualizações transmitidas em tempo real via WebSockets.'}
            </p>

            {onResetOrder && (
              <button
                onClick={onResetOrder}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-sm active:scale-[0.98]"
              >
                {orderStatus === 'DELIVERED' ? 'Fazer Novo Pedido' : 'Ver Cardápio'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL: Cardápio com Visual Comercial de Alto Padrão
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-32 animate-fadeIn">
      {/* Botão Voltar */}
      {onResetOrder && (
        <button
          onClick={onResetOrder}
          className="self-start flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para Restaurantes
        </button>
      )}

      {/* Banner Principal do Restaurante */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-200/60 bg-white shadow-card">
        {/* Capa Fotográfica */}
        <div className="relative h-48 md:h-56 w-full overflow-hidden bg-zinc-900">
          <img
            src={restaurant?.imageUrl || "/images/restaurants/burger.jpg"}
            alt={`Capa ${restaurant?.name || 'Restaurante'}`}
            className="w-full h-full object-cover scale-105"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/images/restaurants/burger.jpg')) {
                e.currentTarget.src = '/images/restaurants/burger.jpg';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Informações Sobrepostas do Restaurante */}
        <div className="relative px-6 pb-6 pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {/* Logo do Restaurante */}
            <div className="-mt-14 md:-mt-16 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border-4 border-white shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
              <span className="text-2xl md:text-3xl font-extrabold text-orange-500 tracking-tighter">
                {restaurant?.name ? restaurant.name.substring(0, 2).toUpperCase() : 'RP'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
                  {restaurant?.name || 'Restaurante'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aberto Agora
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {restaurant?.description || `${restaurant?.category || 'Culinária'} • Delivery Rápido`}
              </p>

              {/* Informações Rápidas */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs font-semibold text-zinc-600">
                <span className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/60 shadow-sm">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <strong className="text-zinc-900">{restaurant?.rating?.toFixed(1) || '5.0'}</strong>
                  <span className="text-zinc-400">(150+ avaliações)</span>
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/60 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{restaurant?.deliveryTime || '30 - 45 min'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/60 shadow-sm">
                  <Bike className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    {Number(restaurant?.deliveryFee) === 0 
                      ? 'Entrega Grátis' 
                      : `Entrega R$ ${Number(restaurant?.deliveryFee || 5).toFixed(2).replace('.', ',')}`
                    }
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Sacola no Banner */}
          {totalCartCount > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Sacola ({totalCartCount})</span>
              </div>
              <span className="bg-black/20 px-2.5 py-0.5 rounded-lg text-xs font-black">
                R$ {grandTotal.toFixed(2).replace('.', ',')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca Interativo */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pratos, bebidas ou sobremesas..."
            className="w-full bg-white border border-zinc-200/60 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categorias */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === 'Todos'
                ? menuItems.length
                : menuItems.filter((m) => m.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200/60'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Pratos do Cardápio */}
      {loadingMenu ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-white border border-zinc-200/60 animate-pulse p-4 flex flex-col justify-between shadow-card"
            >
              <div className="h-36 bg-zinc-100 rounded-xl" />
              <div className="h-4 bg-zinc-100 rounded w-3/4 mt-3" />
              <div className="h-3 bg-zinc-100 rounded w-1/2" />
              <div className="flex justify-between items-center mt-4">
                <div className="h-6 bg-zinc-100 rounded w-20" />
                <div className="h-8 bg-zinc-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : menuError ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200/60 p-8 shadow-card">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">Erro ao carregar cardápio</h3>
          <p className="text-zinc-500 text-xs mt-1">{menuError}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200/60 p-8 shadow-card">
          <UtensilsCrossed className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">Nenhum prato encontrado</h3>
          <p className="text-zinc-500 text-xs mt-1">
            {searchQuery
              ? `Nenhum resultado para "${searchQuery}". Tente outro termo.`
              : 'Nenhum prato cadastrado nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              quantityInCart={getItemQuantity(item.id)}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
            />
          ))}
        </div>
      )}

      {/* Barra Flutuante de Sacola no Rodapé (Mobile / Desktop) */}
      {totalCartCount > 0 && !isDrawerOpen && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40 animate-slideUp">
          <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-white/95 border border-zinc-200 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {totalCartCount}
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Total com entrega:</span>
                <p className="text-base font-extrabold text-zinc-900">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Ver Sacola</span>
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer da Sacola Renderizado via createPortal (Sempre no topo da tela) */}
      <CartDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cart={cart}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onClearItem={handleClearItem}
        notes={notes}
        onChangeNotes={setNotes}
        paymentMethod={paymentMethod}
        onChangePaymentMethod={setPaymentMethod}
        deliveryFee={deliveryFee}
        onConfirmOrder={handleConfirmOrder}
        isLoading={isLoading}
        socketConnected={socketConnected}
      />

      {/* Modal de Autenticação */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          setIsDrawerOpen(true);
        }}
      />
    </div>
  );
};
