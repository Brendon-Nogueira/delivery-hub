import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Bike, Clock, ChevronRight } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { RestaurantDTO } from '@delivery-hub/shared';

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Burgers & Smash': '/images/restaurants/burger.jpg',
  'Pizzaria Artesanal': '/images/restaurants/pizza.jpg',
  'Doceria & Açaí': '/images/restaurants/acai.jpg',
  'Comida Japonesa': '/images/restaurants/sushi.jpg',
};

const getRestaurantImage = (restaurant: RestaurantDTO) => {
  if (restaurant.imageUrl) return restaurant.imageUrl;
  return CATEGORY_FALLBACK_IMAGES[restaurant.category] || '/images/restaurants/burger.jpg';
};

interface MarketplaceViewProps {
  onSelectRestaurant: (restaurantId: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onSelectRestaurant }) => {
  const [restaurants, setRestaurants] = useState<RestaurantDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const query = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
    
    apiFetch<RestaurantDTO[]>(`/api/v1/restaurants${query}`)
      .then((data) => {
        if (isMounted) {
          setRestaurants(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => console.error('Erro ao buscar restaurantes:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-20 animate-fadeIn">
      {/* Header do Marketplace */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-zinc-200/60">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">O que vamos pedir hoje?</h1>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-500" />
            Entregando em <strong className="text-zinc-700">Paraisópolis - MG</strong>
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar restaurantes ou culinária..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Grid de Restaurantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Skeleton Loading
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-3xl border border-zinc-200/60 bg-white overflow-hidden shadow-card animate-pulse">
              <div className="h-40 bg-zinc-100" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-6 bg-zinc-100 rounded-md w-3/4" />
                <div className="h-4 bg-zinc-100 rounded-md w-1/2" />
                <div className="flex gap-2 mt-2">
                  <div className="h-8 bg-zinc-100 rounded-xl w-20" />
                  <div className="h-8 bg-zinc-100 rounded-xl w-24" />
                </div>
              </div>
            </div>
          ))
        ) : restaurants.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Nenhum restaurante encontrado</h3>
            <p className="text-zinc-500 text-sm mt-1">Tente buscar por outro termo ou categoria.</p>
          </div>
        ) : (
          restaurants.map((restaurant) => {
            const fallbackImg = CATEGORY_FALLBACK_IMAGES[restaurant.category] || '/images/restaurants/burger.jpg';
            return (
              <button
                key={restaurant.id}
                onClick={() => onSelectRestaurant(restaurant.id)}
                className="group text-left rounded-3xl border border-zinc-200/60 bg-white overflow-hidden shadow-card hover:shadow-card-hover hover:border-brand-300 transition-all active:scale-[0.98] flex flex-col relative"
              >
                {/* Capa */}
                <div className="relative h-40 w-full overflow-hidden bg-zinc-900">
                  <img
                    src={getRestaurantImage(restaurant)}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith(fallbackImg)) {
                        e.currentTarget.src = fallbackImg;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 shadow-sm">
                      {restaurant.category}
                    </span>
                  </div>
                </div>

              {/* Informações */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-black text-zinc-900 group-hover:text-brand-600 transition-colors line-clamp-1 pr-2">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-xs font-bold border border-amber-200/50">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{restaurant.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                </div>
                
                <p className="text-xs text-zinc-500 line-clamp-1 mb-4">
                  {restaurant.description || 'Restaurante parceiro'}
                </p>

                <div className="mt-auto flex items-center gap-3 text-xs font-semibold text-zinc-600">
                  <span className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-200/60">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{restaurant.deliveryTime || '30-45 min'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-200/60">
                    <Bike className="w-3.5 h-3.5 text-brand-500" />
                    <span>
                      {Number(restaurant.deliveryFee) === 0 
                        ? <span className="text-emerald-600">Grátis</span>
                        : `R$ ${Number(restaurant.deliveryFee).toFixed(2).replace('.', ',')}`
                      }
                    </span>
                  </span>
                </div>
              </div>
              
              {/* Seta de ação hover */}
              <div className="absolute right-4 bottom-5 w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          );
        })
      )}
      </div>
    </div>
  );
};
