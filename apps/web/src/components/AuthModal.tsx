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

  // Form states
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
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl text-zinc-100 z-10">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Título & Ícone */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600/10 text-red-500 mb-3 border border-red-500/20">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Acesse sua Conta' : 'Criar nova Conta'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Faça login para acompanhar e realizar seus pedidos'
              : 'Cadastre-se para aproveitar o DeliveryHub'}
          </p>
        </div>

        {/* Abas */}
        <div className="flex p-1 bg-zinc-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'login' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
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
              mode === 'register' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="CUSTOMER">Cliente (Fazer Pedidos)</option>
                  <option value="RESTAURANT_OWNER">Restaurante (Gerenciar Cozinha)</option>
                  <option value="DRIVER">Entregador (Aceitar Corridas)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Telefone (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(35) 99999-9999"
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar e Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Atalhos de 1 Clique */}
        <div className="mt-5 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-bold text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Acesso Rápido para Demonstração:</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuick('CUSTOMER')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-center transition hover:border-red-500"
            >
              <span className="block font-bold text-red-400 text-xs">👤 Cliente</span>
              <span className="text-[10px] text-zinc-400">Teste</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('RESTAURANT')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-center transition hover:border-amber-500"
            >
              <span className="block font-bold text-amber-400 text-xs">🍳 Dono</span>
              <span className="text-[10px] text-zinc-400">Restaurante</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('DRIVER')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-center transition hover:border-orange-500"
            >
              <span className="block font-bold text-orange-400 text-xs">🛵 Carlos</span>
              <span className="text-[10px] text-zinc-400">Entregador</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
