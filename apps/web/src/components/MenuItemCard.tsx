import React, { useState } from 'react';
import { Plus, Minus, Check, Utensils } from 'lucide-react';
import { FOOD_VISUAL_MAP, getCategoryEmoji } from '../utils/foodImages';

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: number;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  quantityInCart,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const numericPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericPrice);

  const visualMeta = FOOD_VISUAL_MAP[item.id] || {
    emoji: getCategoryEmoji(item.category),
    bgGradient: 'from-zinc-800 to-zinc-950',
    accentColor: '#EF4444',
    fallbackUrl: item.imageUrl || '',
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Pratos Feitos':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Lanches':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Bebidas':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Sobremesas':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-zinc-900 border transition-all duration-200 hover:shadow-lg hover:border-zinc-700 ${
        quantityInCart > 0
          ? 'border-red-500/50 shadow-md shadow-red-500/5 ring-1 ring-red-500/30'
          : 'border-zinc-800'
      }`}
    >
      {/* Imagem do Prato com Fallback Garantido */}
      <div className="relative h-44 w-full overflow-hidden bg-zinc-950">
        {item.imageUrl && !imgError ? (
          <>
            <img
              src={item.imageUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 bg-zinc-800 animate-pulse flex items-center justify-center">
                <Utensils className="w-8 h-8 text-zinc-600 animate-spin" />
              </div>
            )}
          </>
        ) : (
          /* Fallback visual apetitoso: NUNCA mostra imagem quebrada */
          <div
            className={`h-full w-full flex flex-col items-center justify-center bg-gradient-to-br ${visualMeta.bgGradient} p-4 text-center relative overflow-hidden`}
          >
            <div className="text-5xl select-none mb-1 transform group-hover:scale-110 transition-transform duration-300">
              {visualMeta.emoji}
            </div>
            <span className="text-xs font-semibold text-zinc-300/90 tracking-wide line-clamp-1">
              {item.name}
            </span>
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          </div>
        )}

        {/* Gradiente suave na base para contraste */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-90 pointer-events-none" />

        {/* Badge da Categoria */}
        <span
          className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${getCategoryBadgeClass(
            item.category
          )}`}
        >
          {item.category}
        </span>

        {/* Badge se tiver itens adicionados na sacola */}
        {quantityInCart > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{quantityInCart} na sacola</span>
          </div>
        )}
      </div>

      {/* Informações do Item */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 group-hover:text-red-400 transition-colors line-clamp-1">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Preço e Botão de Ação */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Preço</span>
            <span className="text-lg font-black text-zinc-100">{formattedPrice}</span>
          </div>

          {quantityInCart > 0 ? (
            <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => onRemoveFromCart(item)}
                className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center transition-all active:scale-90"
                title="Diminuir"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold text-white">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all active:scale-90 font-bold"
                title="Aumentar"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all active:scale-95 shadow-sm shadow-red-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
