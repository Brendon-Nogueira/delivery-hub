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
} from 'lucide-react';
import { MenuItemCard, MenuItem } from '../components/MenuItemCard';
import { CartDrawer, CartItem } from '../components/CartDrawer';
import { MapTracker } from '../components/MapTracker';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
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
}) => {
  const { isAuthenticated, quickLogin } = useAuth();

  // Estados do Cardápio
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

  // Carregar itens do cardápio real da API
  useEffect(() => {
    let isMounted = true;
    setLoadingMenu(true);
    setMenuError(null);

    apiFetch<MenuItem[]>('/api/v1/menu/restaurant/rest-123')
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setMenuItems(data);
          } else {
            setMenuItems([]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Erro ao buscar cardápio:', err);
          setMenuError('Não foi possível carregar os pratos no momento.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingMenu(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const grandTotal = subtotal > 0 ? subtotal + DELIVERY_FEE : 0;

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
        <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                Acompanhamento em Tempo Real
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                Restaurante Paraisópolis
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Destino: Praça Cel. José Vieira, Centro, Paraisópolis - MG</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-zinc-700 bg-zinc-800 text-zinc-300">
                Pedido #{activeOrder?.id?.slice(0, 8) || 'Ativo'}
              </span>
            </div>
          </div>

          {/* Banner do Status Atual */}
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusColors[orderStatus]} animate-pulse`} />
              <h3 className="text-base font-bold text-white tracking-wide">
                {orderStatus === 'PENDING' && 'Pedido Enviado para a Cozinha'}
                {orderStatus === 'PREPARING' && 'Cozinha Preparando Seu Prato'}
                {orderStatus === 'READY' && 'Pronto! Aguardando o Entregador'}
                {orderStatus === 'ON_THE_WAY' && 'Entregador em Rota até Você'}
                {orderStatus === 'DELIVERED' && 'Pedido Entregue com Sucesso'}
              </h3>
            </div>
            <p className="mt-2 text-zinc-400 text-xs font-medium">{statusMessages[orderStatus]}</p>
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
                    className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                      isActive
                        ? 'border-red-500 bg-red-600/10 text-white shadow-sm'
                        : isPast
                        ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300'
                        : 'border-zinc-800/60 bg-zinc-900/40 text-zinc-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                        isActive
                          ? 'bg-red-600 text-white'
                          : isPast
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : stepIdx + 1}
                    </div>
                    <span className="text-xs font-bold">{stepLabels[step]}</span>
                  </div>
                );
              }
            )}
          </div>

          {/* Mapa do Leaflet */}
          <div className="rounded-2xl overflow-hidden border border-zinc-800 shadow-xl h-[380px] mb-6">
            <MapTracker
              restaurantLocation={restaurantLocation}
              customerLocation={customerLocation}
              driverLocation={driverLocation}
              orderStatus={orderStatus}
            />
          </div>

          {/* Ações pós-entrega ou retorno */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-400">
              {orderStatus === 'DELIVERED'
                ? 'Seu pedido foi entregue. Obrigado pela preferência!'
                : 'Atualizações transmitidas em tempo real via WebSockets.'}
            </p>

            {onResetOrder && (
              <button
                onClick={onResetOrder}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition border border-zinc-700"
              >
                {orderStatus === 'DELIVERED' ? 'Fazer Novo Pedido' : 'Ver Cardápio'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL: Cardápio com Visual iFood / Gourmet Profissional
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-32 animate-fadeIn">
      {/* Banner Principal do Restaurante (Estilo iFood) */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Capa Fotográfica */}
        <div className="relative h-44 md:h-52 w-full overflow-hidden bg-zinc-950">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
            alt="Capa Restaurante Paraisópolis"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
        </div>

        {/* Informações Sobrepostas do Restaurante */}
        <div className="relative px-6 pb-6 pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {/* Logo / Avatar do Restaurante */}
            <div className="-mt-12 md:-mt-14 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-zinc-900 border-4 border-zinc-900 shadow-2xl overflow-hidden flex items-center justify-center text-3xl font-black text-red-500 flex-shrink-0">
              🍳
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Restaurante Paraisópolis
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Aberto
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Culinária Mineira • Carnes na Chapa • Lanches Artesanais
              </p>

              {/* Informações Rápidas */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-semibold text-zinc-300">
                <span className="flex items-center gap-1 bg-zinc-800/90 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <strong className="text-white">4.9</strong>
                  <span className="text-zinc-500">(150+ avaliações)</span>
                </span>
                <span className="flex items-center gap-1 bg-zinc-800/90 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>30 - 45 min</span>
                </span>
                <span className="flex items-center gap-1 bg-zinc-800/90 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                  <Bike className="w-3.5 h-3.5 text-red-400" />
                  <span>Entrega R$ 5,00</span>
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Sacola no Banner */}
          {totalCartCount > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-600/20 active:scale-95 transition"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Sacola ({totalCartCount})</span>
              </div>
              <span className="bg-black/20 px-2 py-0.5 rounded-lg text-xs font-black">
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
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pratos, bebidas ou sobremesas..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categorias (Pills Estilo iFood) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-zinc-800 text-zinc-500'
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
              className="h-72 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse p-4 flex flex-col justify-between"
            >
              <div className="h-36 bg-zinc-800 rounded-xl" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 mt-3" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
              <div className="flex justify-between items-center mt-4">
                <div className="h-6 bg-zinc-800 rounded w-20" />
                <div className="h-8 bg-zinc-800 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : menuError ? (
        <div className="text-center py-16 bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Erro ao carregar cardápio</h3>
          <p className="text-zinc-400 text-xs mt-1">{menuError}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <UtensilsCrossed className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Nenhum prato encontrado</h3>
          <p className="text-zinc-400 text-xs mt-1">
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
          <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {totalCartCount}
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Total com entrega:</span>
                <p className="text-base font-black text-white">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-lg shadow-red-600/30 active:scale-95"
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
        deliveryFee={DELIVERY_FEE}
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
