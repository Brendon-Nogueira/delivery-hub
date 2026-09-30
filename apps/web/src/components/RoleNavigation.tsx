import React from 'react';
import { ShoppingBag, ChefHat, Bike, ClipboardList, UtensilsCrossed, BarChart3 } from 'lucide-react';

/**
 * CONCEITO: (Role-Based Access Control) no Frontend
 *
 * Cada role do sistema só pode ver e acessar as tabs que lhe pertencem.
 * Isso é diferente de segurança no backend (guards)
 *
 * A segurança está no backend (JwtAuthGuard + RolesGuard).
 * O frontend apenas esconde elementos que o usuário não deveria ver.
 *
 */

export type Role = 'CUSTOMER' | 'RESTAURANT' | 'DRIVER' | 'HISTORY' | 'MANAGEMENT' | 'DASHBOARD';


export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN' | null;

interface TabConfig {
  role: Role;
  label: string;
  icon: React.ReactNode;
  activeIconClass: string;
  activeClass: string;
  /** Quais UserRoles do backend podem ver esta tab */
  allowedRoles: (UserRole)[];
  /** Se true, aparece mesmo sem autenticação */
  showUnauthenticated?: boolean;
}

interface RoleNavigationProps {
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  pendingOrdersCount?: number;
  /** Role do usuário autenticado (AuthContext) */
  userRole?: UserRole;
}

/**
 * Configuração declarativa de todas as tabs do sistema.
 *
 * CONCEITO: Configuration-Driven UI
 * Ao invés de escrever cada botão com if/else, declaramos a configuração
 * e deixamos o .filter() + .map() cuidar da renderização.
 * Isso facilita adicionar novas tabs no futuro.
 */
const TABS: TabConfig[] = [
  {
    role: 'CUSTOMER',
    label: 'Cardápio',
    icon: <ShoppingBag className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow',
    allowedRoles: ['CUSTOMER', null],
    showUnauthenticated: true,
  },
  {
    role: 'HISTORY',
    label: 'Meus Pedidos',
    icon: <ClipboardList className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow',
    allowedRoles: ['CUSTOMER'],
  },
  {
    role: 'RESTAURANT',
    label: 'KDS',
    icon: <ChefHat className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'MANAGEMENT',
    label: 'Gestão Cardápio',
    icon: <UtensilsCrossed className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'DASHBOARD',
    label: 'Dashboard',
    icon: <BarChart3 className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'DRIVER',
    label: 'Entregas',
    icon: <Bike className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25',
    allowedRoles: ['DRIVER'],
  },
];

export const RoleNavigation: React.FC<RoleNavigationProps> = ({
  currentRole,
  onChangeRole,
  pendingOrdersCount = 0,
  userRole = null,
}) => {
  /**
   * CONCEITO: Filtragem por permissão
   * Cada tab declara quais roles podem vê-la.
   * Se o usuário não está autenticado (userRole === null),
   * só vê tabs com showUnauthenticated: true.
   */
  const visibleTabs = TABS.filter((tab) => {
    if (!userRole) {
      return tab.showUnauthenticated === true;
    }
    return tab.allowedRoles.includes(userRole);
  });

  return (
    <nav className="inline-flex items-center p-1.5 bg-white border border-zinc-200/60 rounded-2xl shadow-card gap-1 flex-wrap">
      {visibleTabs.map((tab) => {
        const isActive = currentRole === tab.role;

        return (
          <button
            key={tab.role}
            onClick={() => onChangeRole(tab.role)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isActive
                ? tab.activeClass
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <span className={isActive ? tab.activeIconClass : 'text-zinc-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>

            {/* Badge pulsante */}
            {tab.role === 'RESTAURANT' && pendingOrdersCount > 0 && (
              <span className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-rose-400 opacity-75" />
                <span className="relative flex h-4 min-w-4 px-1.5 rounded-full bg-rose-500 text-white text-[10px] items-center justify-center font-black shadow-sm">
                  {pendingOrdersCount}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
