import React, { useState } from 'react';
import { ShoppingBag, LogIn, LogOut, MapPin, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAddress } from '../contexts/AddressContext';
import { useCart } from '../contexts/CartContext';
import { AuthModal } from './AuthModal';

export const UserHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { address, openAddressModal, formatAddressSummary } = useAddress();
  const { totalCount, openDrawer } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CUSTOMER':
        return { label: 'Cliente', color: 'bg-brand-50 text-brand-600 border-brand-200' };
      case 'RESTAURANT_OWNER':
        return { label: 'Restaurante', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'DRIVER':
        return { label: 'Entregador', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: role, color: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 py-3.5 px-5 mb-6 rounded-2xl bg-white border border-zinc-200/60 shadow-card">
        {/* Logo da Marca */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-zinc-900">
                Delivery<span className="text-orange-500">Hub</span>
              </span>
              <span className="hidden sm:inline-flex text-[9px] uppercase font-bold tracking-widest text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Paraisópolis • MG
            </p>
          </div>
        </div>

        {/* Localização da Entrega */}
        <button
          type="button"
          onClick={openAddressModal}
          className="hidden md:flex items-center gap-2.5 text-xs text-zinc-600 bg-zinc-50 hover:bg-orange-50/50 px-4 py-2 rounded-xl border border-zinc-200/60 hover:border-orange-300 transition-all cursor-pointer active:scale-[0.98] group text-left"
          title="Clique para alterar o endereço de entrega"
        >
          <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block leading-tight">Entregar em</span>
            <span className="font-bold text-zinc-800 truncate max-w-[220px] block">
              {formatAddressSummary(address)}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-500 transition-colors ml-1" />
        </button>

        {/* Área do Usuário */}
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={openDrawer}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
              title="Abrir sacola de pedidos"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Sacola</span>
              <span className="bg-white text-brand-600 px-1.5 py-0.5 rounded-md text-[11px] font-black leading-none">
                {totalCount}
              </span>
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5 bg-zinc-50 py-1.5 px-3 rounded-xl border border-zinc-200/60">
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-800 truncate max-w-[130px]">
                      {user.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getRoleBadge(user.role).color}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate block max-w-[130px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => openAuth('login')}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 transition-all active:scale-[0.98]"
                title="Trocar de conta"
              >
                Trocar
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-[0.98]"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="flex items-center gap-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  );
};
