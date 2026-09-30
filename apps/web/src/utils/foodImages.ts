/**
 * foodImages.ts — URLs de alta resolução e metadados para fotografia gastronômica.
 * Elimina emojis e garante visual comercial profissional.
 */

export interface FoodVisualMeta {
  bgGradient: string;
  accentColor: string;
  fallbackUrl: string;
}

export const FOOD_VISUAL_MAP: Record<string, FoodVisualMeta> = {
  // Pratos Feitos / Lanches
  'item-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#DC2626',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  // Lanches & Porções
  'item-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-5': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#E11D48',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-6': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#CA8A04',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  // Bebidas
  'item-7': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-8': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EF4444',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  'item-9': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#FBBF24',
    fallbackUrl: '/images/restaurants/burger.jpg',
  },
  // Sobremesas / Doces
  'item-10': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/restaurants/acai.jpg',
  },
  'item-11': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: '/images/restaurants/acai.jpg',
  },
  // Pizzas
  'pizza-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#DC2626',
    fallbackUrl: '/images/restaurants/pizza.jpg',
  },
  'pizza-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/restaurants/pizza.jpg',
  },
  'pizza-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/restaurants/pizza.jpg',
  },
  // Açaí
  'acai-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#9333EA',
    fallbackUrl: '/images/restaurants/acai.jpg',
  },
  'acai-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#A855F7',
    fallbackUrl: '/images/restaurants/acai.jpg',
  },
  // Sushi
  'sushi-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/restaurants/sushi.jpg',
  },
  'sushi-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: '/images/restaurants/sushi.jpg',
  },
};

