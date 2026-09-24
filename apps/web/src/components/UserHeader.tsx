import React, { useState } from 'react';
import { ShoppingBag, LogIn, LogOut, MapPin, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

export const UserHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CUSTOMER':
        return { label: 'Cliente', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'RESTAURANT_OWNER':
        return { label: 'Restaurante', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'DRIVER':
        return { label: 'Entregador', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
      default:
        return { label: role, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 px-5 mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
        {/* Logo da Marca */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              Delivery<span className="text-red-500">Hub</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
              Paraisópolis
            </span>
          </div>
        </div>

        {/* Localização da Entrega */}
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-300 bg-zinc-850 px-3.5 py-1.5 rounded-xl border border-zinc-800">
          <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-zinc-500">Entregar em:</span>
          <span className="font-bold text-white truncate max-w-[220px]">
            Praça Cel. José Vieira, Centro
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </div>

        {/* Área do Usuário */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-zinc-850 py-1 px-2.5 rounded-xl border border-zinc-800">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold border border-red-500/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${getRoleBadge(user.role).color}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate block max-w-[120px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => openAuth('login')}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 transition"
                title="Trocar de conta"
              >
                Trocar
              </button>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="flex items-center gap-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl transition shadow-md shadow-red-600/20 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
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
