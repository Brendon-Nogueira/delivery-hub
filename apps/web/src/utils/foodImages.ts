/**
 * foodImages.ts — Fallbacks de alta fidelidade e metadados visuais para os pratos.
 * Garante que nenhuma imagem apareça quebrada ou com texto cortado.
 */

export interface FoodVisualMeta {
  emoji: string;
  bgGradient: string;
  accentColor: string;
  fallbackUrl: string;
}

export const FOOD_VISUAL_MAP: Record<string, FoodVisualMeta> = {
  // Pratos Feitos
  'item-1': {
    emoji: '🍛',
    bgGradient: 'from-amber-600 via-orange-700 to-stone-900',
    accentColor: '#F59E0B',
    fallbackUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  'item-2': {
    emoji: '🍗',
    bgGradient: 'from-amber-700 via-yellow-800 to-zinc-900',
    accentColor: '#D97706',
    fallbackUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  },
  'item-3': {
    emoji: '🥩',
    bgGradient: 'from-red-800 via-rose-900 to-neutral-950',
    accentColor: '#DC2626',
    fallbackUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  },
  // Lanches & Porções
  'item-4': {
    emoji: '🍔',
    bgGradient: 'from-orange-600 via-amber-700 to-stone-950',
    accentColor: '#EA580C',
    fallbackUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  'item-5': {
    emoji: '🥓',
    bgGradient: 'from-red-700 via-orange-800 to-zinc-900',
    accentColor: '#E11D48',
    fallbackUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  },
  'item-6': {
    emoji: '🍟',
    bgGradient: 'from-yellow-600 via-amber-700 to-zinc-950',
    accentColor: '#CA8A04',
    fallbackUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  // Bebidas
  'item-7': {
    emoji: '🍊',
    bgGradient: 'from-orange-500 via-amber-600 to-stone-900',
    accentColor: '#F97316',
    fallbackUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  },
  'item-8': {
    emoji: '🥤',
    bgGradient: 'from-red-800 via-rose-950 to-black',
    accentColor: '#EF4444',
    fallbackUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  },
  'item-9': {
    emoji: '🍺',
    bgGradient: 'from-amber-600 via-yellow-700 to-stone-950',
    accentColor: '#FBBF24',
    fallbackUrl: 'https://images.unsplash.com/photo-1608270110325-1e479c7cbcd4?auto=format&fit=crop&w=600&q=80',
  },
  // Sobremesas
  'item-10': {
    emoji: '🍮',
    bgGradient: 'from-amber-700 via-yellow-800 to-zinc-900',
    accentColor: '#F59E0B',
    fallbackUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
  },
  'item-11': {
    emoji: '🧀',
    bgGradient: 'from-amber-600 via-orange-800 to-stone-900',
    accentColor: '#D97706',
    fallbackUrl: 'https://images.unsplash.com/photo-1559553156-2e97137af16f?auto=format&fit=crop&w=600&q=80',
  },
};

export function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'Pratos Feitos':
      return '🍛';
    case 'Lanches':
      return '🍔';
    case 'Bebidas':
      return '🥤';
    case 'Sobremesas':
      return '🍮';
    default:
      return '🍽️';
  }
}
