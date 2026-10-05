import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ChefHat, Bike, ClipboardList, UtensilsCrossed, BarChart3 } from 'lucide-react';

/**
 * CONCEITO: (Role-Based Access Control) no Frontend
 *
 * Cada role do sistema só pode ver e acessar as tabs que lhe pertencem.
 * Integrado com React Router para suporte a histórico do navegador e URLs amigáveis.
 */

export type Role = 'CUSTOMER' | 'RESTAURANT' | 'DRIVER' | 'HISTORY' | 'MANAGEMENT' | 'DASHBOARD';

export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN' | null;

interface TabConfig {
  role: Role;
  path: string;
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
    path: '/',
    label: 'Cardápio',
    icon: <ShoppingBag className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['CUSTOMER', null],
    showUnauthenticated: true,
  },
  {
    role: 'HISTORY',
    path: '/pedidos',
    label: 'Meus Pedidos',
    icon: <ClipboardList className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['CUSTOMER'],
  },
  {
    role: 'RESTAURANT',
    path: '/kds',
    label: 'KDS',
    icon: <ChefHat className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'MANAGEMENT',
    path: '/gestao',
    label: 'Gestão Cardápio',
    icon: <UtensilsCrossed className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'DASHBOARD',
    path: '/dashboard',
    label: 'Dashboard',
    icon: <BarChart3 className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['RESTAURANT_OWNER'],
  },
  {
    role: 'DRIVER',
    path: '/entregas',
    label: 'Entregas',
    icon: <Bike className="w-4 h-4" />,
    activeIconClass: 'text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    allowedRoles: ['DRIVER'],
  },
];

export const RoleNavigation: React.FC<RoleNavigationProps> = ({
  currentRole,
  onChangeRole,
  pendingOrdersCount = 0,
  userRole = null,
}) => {
  const navigate = useNavigate();

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

  const handleTabClick = (tab: TabConfig) => {
    onChangeRole(tab.role);
    navigate(tab.path);
  };

  return (
    <nav className="inline-flex items-center p-1.5 bg-white border border-zinc-200/60 rounded-2xl shadow-sm gap-1 flex-wrap">
      {visibleTabs.map((tab) => {
        const isActive = currentRole === tab.role;

        return (
          <button
            key={tab.role}
            onClick={() => handleTabClick(tab)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
              isActive
                ? tab.activeClass
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
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
