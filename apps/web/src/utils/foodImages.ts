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
  // Pratos Feitos
  'item-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  'item-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  },
  'item-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#DC2626',
    fallbackUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  },
  // Lanches & Porções
  'item-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  'item-5': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#E11D48',
    fallbackUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  },
  'item-6': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#CA8A04',
    fallbackUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  // Bebidas
  'item-7': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  },
  'item-8': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EF4444',
    fallbackUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  },
  'item-9': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#FBBF24',
    fallbackUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=600&q=80',
  },
  // Sobremesas
  'item-10': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
  },
  'item-11': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: 'https://images.unsplash.com/photo-1559553156-2e97137af16f?auto=format&fit=crop&w=600&q=80',
  },
};

