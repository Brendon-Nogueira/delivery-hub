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
  // Paraíso Smash Burger
  'item-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/products/burger/smash-mantiqueira.jpg',
  },
  'item-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: '/images/products/burger/x-tudo.jpg',
  },
  'item-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#DC2626',
    fallbackUrl: '/images/products/burger/batata-rustica.jpg',
  },
  'item-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/products/burger/onion-rings.jpg',
  },
  'item-5': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#E11D48',
    fallbackUrl: '/images/products/burger/milkshake-avela.jpg',
  },
  'item-6': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#CA8A04',
    fallbackUrl: '/images/products/burger/refrigerante.jpg',
  },
  'item-7': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: '/images/products/burger/suco-laranja.jpg',
  },
  'item-8': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EF4444',
    fallbackUrl: '/images/products/burger/coca-cola.jpg',
  },
  'item-9': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#FBBF24',
    fallbackUrl: '/images/products/burger/cerveja-artesanal.jpg',
  },
  'item-10': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/products/burger/pudim.jpg',
  },
  'item-11': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: '/images/products/burger/queijo-doce-leite.jpg',
  },
  // Pizzas
  'pizza-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#DC2626',
    fallbackUrl: '/images/products/pizza/margherita.jpg',
  },
  'pizza-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/products/pizza/calabresa.jpg',
  },
  'pizza-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/products/pizza/quatro-queijos.jpg',
  },
  'pizza-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#D97706',
    fallbackUrl: '/images/products/pizza/nutella-morango.jpg',
  },
  'pizza-5': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#7C3AED',
    fallbackUrl: '/images/products/pizza/suco-uva.jpg',
  },
  // Açaí & Doceria da Serra
  'acai-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#9333EA',
    fallbackUrl: '/images/products/acai/tigela-acai.jpg',
  },
  'acai-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#A855F7',
    fallbackUrl: '/images/products/acai/milkshake-morango-oreo.jpg',
  },
  'acai-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: '/images/products/acai/bolo-cenoura.jpg',
  },
  'acai-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/products/acai/pudim-leite.jpg',
  },
  // Sushi Hub
  'sushi-1': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#EA580C',
    fallbackUrl: '/images/products/sushi/combinado-30-pecas.jpg',
  },
  'sushi-2': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F97316',
    fallbackUrl: '/images/products/sushi/temaki-salmao.jpg',
  },
  'sushi-3': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#FB923C',
    fallbackUrl: '/images/products/sushi/poke-salmao.jpg',
  },
  'sushi-4': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#F59E0B',
    fallbackUrl: '/images/products/sushi/hot-roll-camarao.jpg',
  },
  'sushi-5': {
    bgGradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#10B981',
    fallbackUrl: '/images/products/sushi/agua-de-coco.jpg',
  },
};

