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
  pendingOrdersCount = 0
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
      <button
        onClick={() => onChangeRole('CUSTOMER')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
          currentRole === 'CUSTOMER'
            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span>Cliente (App)</span>
      </button>

      <button
        onClick={() => onChangeRole('RESTAURANT')}
        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
          currentRole === 'RESTAURANT'
            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-105'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <ChefHat className="w-5 h-5" />
        <span>Restaurante (KDS)</span>
        
        {/* Badge de Novos Pedidos */}
        {pendingOrdersCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] items-center justify-center font-bold">
              {pendingOrdersCount}
            </span>
          </span>
        )}
      </button>

      <button
        onClick={() => onChangeRole('DRIVER')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
          currentRole === 'DRIVER'
            ? 'bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/30 scale-105'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <Bike className="w-5 h-5" />
        <span>Entregador (Mobile)</span>
      </button>
    </div>
  );
};
