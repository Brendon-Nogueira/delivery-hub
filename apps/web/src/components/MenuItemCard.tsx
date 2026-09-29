import React, { useState } from 'react';
import { Plus, Minus, Check } from 'lucide-react';
import { FOOD_VISUAL_MAP } from '../utils/foodImages';

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
  const [fallbackTried, setFallbackTried] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const numericPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const priceParts = numericPrice.toFixed(2).split('.');
  const integerPart = priceParts[0];
  const decimalPart = priceParts[1];

  const visualMeta = FOOD_VISUAL_MAP[item.id];
  const resolvedImageUrl = fallbackTried
    ? visualMeta?.fallbackUrl || item.imageUrl
    : item.imageUrl || visualMeta?.fallbackUrl;

  const handleImageError = () => {
    if (!fallbackTried && visualMeta?.fallbackUrl && visualMeta.fallbackUrl !== item.imageUrl) {
      setFallbackTried(true);
    } else {
      setImgError(true);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Pratos Feitos':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Lanches':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'Bebidas':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Sobremesas':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        quantityInCart > 0
          ? 'border-brand-300 shadow-brand-glow ring-1 ring-brand-200'
          : 'border-zinc-200/60 shadow-card hover:border-zinc-300'
      }`}
    >
      {/* Imagem do Prato Fotográfica (Sem Emojis) */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
        {resolvedImageUrl && !imgError ? (
          <>
            <img
              src={resolvedImageUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={handleImageError}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 bg-zinc-100 animate-pulse flex items-center justify-center">
                <span className="text-xs text-zinc-400 font-medium">Carregando imagem...</span>
              </div>
            )}
          </>
        ) : (
          <div
            className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 p-6 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-sm font-black text-brand-500 mb-2 shadow-sm">
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-zinc-500 tracking-wide line-clamp-1">
              {item.name}
            </span>
          </div>
        )}

        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Badge da Categoria */}
        <span
          className={`absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md shadow-sm ${getCategoryBadgeClass(
            item.category
          )}`}
        >
          {item.category}
        </span>

        {/* Badge */}
        {quantityInCart > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-brand-glow animate-fadeIn">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{quantityInCart} na sacola</span>
          </div>
        )}
      </div>

      {/* Informações do Item */}
      <div className="flex flex-1 flex-col justify-between p-4 pt-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 group-hover:text-brand-600 transition-colors line-clamp-1">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400 italic">
              Prato preparado com ingredientes frescos selecionados.
            </p>
          )}
        </div>

        {/* Preço e Botão de Ação */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">A partir de</span>
            <div className="flex items-baseline text-zinc-900">
              <span className="text-xs font-bold text-zinc-400 mr-0.5">R$</span>
              <span className="text-xl font-black tracking-tight">{integerPart}</span>
              <span className="text-xs font-bold text-zinc-400">,{decimalPart}</span>
            </div>
          </div>

          {quantityInCart > 0 ? (
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => onRemoveFromCart(item)}
                className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition active:scale-90 border border-zinc-200"
                title="Diminuir"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-black text-zinc-900">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="w-7 h-7 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-amber-500 text-white flex items-center justify-center transition active:scale-90 shadow-sm"
                title="Aumentar"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-amber-500 text-white font-bold text-xs transition-all shadow-brand-glow active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
