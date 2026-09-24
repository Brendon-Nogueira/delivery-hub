import React from 'react';
import { ShoppingBag, ChefHat, Bike } from 'lucide-react';

export type Role = 'CUSTOMER' | 'RESTAURANT' | 'DRIVER';

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
    <nav className="inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md">
      <button
        onClick={() => onChangeRole('CUSTOMER')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          currentRole === 'CUSTOMER'
            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
        }`}
      >
        <ShoppingBag className={`w-4 h-4 ${currentRole === 'CUSTOMER' ? 'text-red-500' : 'text-zinc-500'}`} />
        <span>Cliente (App)</span>
      </button>

      <button
        onClick={() => onChangeRole('RESTAURANT')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          currentRole === 'RESTAURANT'
            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
        }`}
      >
        <ChefHat className={`w-4 h-4 ${currentRole === 'RESTAURANT' ? 'text-amber-500' : 'text-zinc-500'}`} />
        <span>Restaurante (KDS)</span>

        {/* Badge */}
        {pendingOrdersCount > 0 && (
          <span className="flex h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] items-center justify-center font-bold">
            {pendingOrdersCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onChangeRole('DRIVER')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          currentRole === 'DRIVER'
            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
        }`}
      >
        <Bike className={`w-4 h-4 ${currentRole === 'DRIVER' ? 'text-orange-400' : 'text-zinc-500'}`} />
        <span>Entregador (Mobile)</span>
      </button>
    </nav>
  );
};
