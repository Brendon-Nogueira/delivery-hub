/**
 * ToastProvider — Sistema de notificações não-bloqueantes.
 *
 * CONCEITOS QUE VOCÊ VAI APRENDER:
 *
 * 1. CONTEXT API + REDUCER:
 *    Diferente de um único useState, usamos useReducer para gerenciar uma LISTA
 *    de toasts com ações "ADD" e "REMOVE". É como um mini-Redux dentro do React.
 *    O reducer é uma função pura: (estado_atual, ação) => novo_estado.
 *
 * 2. createPortal:
 *    Os toasts são renderizados FORA da árvore de componentes normal, direto no
 *    document.body. Isso garante que eles fiquem sempre no topo, independente de
 *    z-index ou overflow de qualquer componente pai (regra do SKILL.md).
 *
 * 3. setTimeout COM CLEANUP:
 *    Cada toast tem um timer de auto-dismiss (5s). Quando o componente desmonta
 *    ou o toast é removido manualmente, o timer é cancelado (clearTimeout) para
 *    evitar memory leaks — um erro comum em React.
 *
 * 4. useCallback:
 *    A função `addToast` é envolvida em useCallback para manter a referência
 *    estável entre renders. Sem isso, todos os componentes que usam `useToast()`
 *    re-renderizariam desnecessariamente toda vez que o provider atualiza.
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// Tipos de toast disponíveis
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, padrão 5000
}

// Ações do reducer
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

// Reducer: função pura que gerencia o estado
function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Máximo de 5 toasts simultâneos (remove o mais antigo)
      const newState = [...state, action.toast];
      return newState.length > 5 ? newState.slice(1) : newState;
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// Context
interface ToastContextData {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

// Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({ type: 'ADD', toast: { ...toast, id } });
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Renderiza os toasts via Portal direto no body */}
      {createPortal(
        <div
          className="fixed top-4 right-4 z-[10001] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
          aria-live="polite"
          aria-label="Notificações"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// Hook para usar em qualquer componente
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};

// Componente individual de cada toast
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const duration = toast.duration ?? 5000;

  // Auto-dismiss com cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    // Cleanup: cancela o timer se o componente desmontar antes
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const config = {
    success: {
      icon: CheckCircle2,
      containerClass: 'bg-white border-emerald-200',
      iconClass: 'text-emerald-500',
      barClass: 'bg-emerald-500',
    },
    error: {
      icon: AlertCircle,
      containerClass: 'bg-white border-rose-200',
      iconClass: 'text-rose-500',
      barClass: 'bg-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      containerClass: 'bg-white border-amber-200',
      iconClass: 'text-amber-500',
      barClass: 'bg-amber-500',
    },
    info: {
      icon: Info,
      containerClass: 'bg-white border-blue-200',
      iconClass: 'text-blue-500',
      barClass: 'bg-blue-500',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-card-hover animate-slideUp ${config.containerClass}`}
      role="alert"
    >
      {/* Ícone */}
      <div className={`mt-0.5 flex-shrink-0 ${config.iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Botão Fechar */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition active:scale-90"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Barra de progresso animada */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden bg-zinc-100">
        <div
          className={`h-full ${config.barClass} rounded-full`}
          style={{
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};
