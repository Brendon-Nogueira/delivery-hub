import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogIn, UserPlus, Mail, Lock, User, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const { login, register, quickLogin, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState<string | null>(null);

  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER'>('CUSTOMER');
  const [phone, setPhone] = useState('');

  // Travar o scroll enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, phone: phone || undefined });
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar autenticação');
    }
  };

  const handleQuick = async (roleType: 'CUSTOMER' | 'RESTAURANT' | 'DRIVER') => {
    setError(null);
    try {
      await quickLogin(roleType);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao efetuar login rápido');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-drawer text-zinc-900 z-10">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Título & Ícone */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 mb-3 border border-brand-200 shadow-brand-glow">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            {mode === 'login' ? 'Acesse sua Conta' : 'Criar nova Conta'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Faça login para acompanhar e realizar seus pedidos em tempo real'
              : 'Cadastre-se para aproveitar o melhor do DeliveryHub'}
          </p>
        </div>

        {/* Abas */}
        <div className="flex p-1 bg-zinc-100 rounded-xl mb-6 border border-zinc-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'login' ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'register' ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

       
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                >
                  <option value="CUSTOMER">Cliente (Fazer Pedidos)</option>
                  <option value="RESTAURANT_OWNER">Restaurante (Gerenciar Cozinha)</option>
                  <option value="DRIVER">Entregador (Aceitar Corridas)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Telefone (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(35) 99999-9999"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-500 active:scale-95 text-white font-black text-xs transition-all shadow-brand-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no DeliveryHub</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta e Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Atalhos de Demonstração */}
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-bold text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Acesso Rápido para Demonstração:</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuick('CUSTOMER')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-brand-50 border border-zinc-200 text-center transition hover:border-brand-300 active:scale-95"
            >
              <span className="block font-black text-brand-600 text-xs">Cliente</span>
              <span className="text-[10px] text-zinc-400 font-medium">Conta Demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('RESTAURANT')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-amber-50 border border-zinc-200 text-center transition hover:border-amber-300 active:scale-95"
            >
              <span className="block font-black text-amber-600 text-xs">Restaurante</span>
              <span className="text-[10px] text-zinc-400 font-medium">Gestão KDS</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('DRIVER')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 text-center transition hover:border-emerald-300 active:scale-95"
            >
              <span className="block font-black text-emerald-600 text-xs">Entregador</span>
              <span className="text-[10px] text-zinc-400 font-medium">App Mobile</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
