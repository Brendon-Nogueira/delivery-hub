import React from 'react';
import { ShoppingBag, ChefHat, Bike, ClipboardList } from 'lucide-react';

export type Role = 'CUSTOMER' | 'RESTAURANT' | 'DRIVER' | 'HISTORY';

interface RoleNavigationProps {
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  pendingOrdersCount?: number;
}

export const RoleNavigation: React.FC<RoleNavigationProps> = ({
  currentRole,
  onChangeRole,
  pendingOrdersCount = 0,
}) => {
  return (
    <nav className="inline-flex items-center p-1.5 bg-white border border-zinc-200/60 rounded-2xl shadow-card gap-1 flex-wrap">
      <button
        onClick={() => onChangeRole('CUSTOMER')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
          currentRole === 'CUSTOMER'
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
        }`}
      >
        <ShoppingBag className={`w-4 h-4 ${currentRole === 'CUSTOMER' ? 'text-white' : 'text-zinc-400'}`} />
        <span>Cardápio</span>
      </button>

      <button
        onClick={() => onChangeRole('HISTORY')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
          currentRole === 'HISTORY'
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
        }`}
      >
        <ClipboardList className={`w-4 h-4 ${currentRole === 'HISTORY' ? 'text-white' : 'text-zinc-400'}`} />
        <span>Meus Pedidos</span>
      </button>

      <button
        onClick={() => onChangeRole('RESTAURANT')}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
          currentRole === 'RESTAURANT'
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
        }`}
      >
        <ChefHat className={`w-4 h-4 ${currentRole === 'RESTAURANT' ? 'text-white' : 'text-zinc-400'}`} />
        <span>Restaurante (KDS)</span>

        {/* Badge Pulsante */}
        {pendingOrdersCount > 0 && (
          <span className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative flex h-4 min-w-4 px-1.5 rounded-full bg-rose-500 text-white text-[10px] items-center justify-center font-black shadow-sm">
              {pendingOrdersCount}
            </span>
          </span>
        )}
      </button>

      <button
        onClick={() => onChangeRole('DRIVER')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
          currentRole === 'DRIVER'
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
        }`}
      >
        <Bike className={`w-4 h-4 ${currentRole === 'DRIVER' ? 'text-white' : 'text-zinc-400'}`} />
        <span>Entregador</span>
      </button>
    </nav>
  );
};
