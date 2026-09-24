import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Zap,
} from 'lucide-react';
import { MenuItem } from './MenuItemCard';
import { FOOD_VISUAL_MAP, getCategoryEmoji } from '../utils/foodImages';
import { useAuth } from '../contexts/AuthContext';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (item: MenuItem) => void;
  onClearItem: (itemId: string) => void;
  notes: string;
  onChangeNotes: (notes: string) => void;
  paymentMethod: 'PIX' | 'CARTAO' | 'DINHEIRO';
  onChangePaymentMethod: (method: 'PIX' | 'CARTAO' | 'DINHEIRO') => void;
  deliveryFee: number;
  onConfirmOrder: () => Promise<void>;
  isLoading: boolean;
  socketConnected: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onClearItem,
  notes,
  onChangeNotes,
  paymentMethod,
  onChangePaymentMethod,
  deliveryFee,
  onConfirmOrder,
  isLoading,
  socketConnected,
}) => {
  const { isAuthenticated, quickLogin } = useAuth();

  // Travar o scroll da página enquanto o drawer estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = cart.reduce((acc, curr) => {
    const price = typeof curr.item.price === 'string' ? parseFloat(curr.item.price) : curr.item.price;
    return acc + price * curr.quantity;
  }, 0);

  const grandTotal = subtotal > 0 ? subtotal + deliveryFee : 0;

  const quickNotes = ['Sem cebola', 'Ponto da carne ao ponto', 'Sem pimenta', 'Talher descartável'];

  const handleAddQuickNote = (note: string) => {
    if (!notes.includes(note)) {
      onChangeNotes(notes ? `${notes}, ${note}` : note);
    }
  };

  // Renderiza via Portal direto no document.body para garantir fixação 100% no viewport da tela
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end animate-fadeIn">
      {/* Backdrop Escuro */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Painel Lateral (Drawer) */}
      <aside className="relative w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 text-zinc-100 flex flex-col shadow-2xl z-10 animate-slideLeft">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center border border-red-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Sua Sacola</h2>
              <p className="text-xs text-zinc-400">Restaurante Paraisópolis</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl mb-4">
                🛒
              </div>
              <h3 className="text-base font-bold text-white">Sua sacola está vazia</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Adicione itens deliciosos do cardápio para fazer seu pedido.
              </p>
            </div>
          ) : (
            <>
              {/* Lista de Itens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Itens Selecionados ({totalItemsCount})</span>
                </div>

                {cart.map(({ item, quantity }) => {
                  const numericPrice =
                    typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                  const itemTotal = numericPrice * quantity;
                  const visualMeta = FOOD_VISUAL_MAP[item.id];

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-850/80 border border-zinc-800 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                          {visualMeta?.emoji || getCategoryEmoji(item.category)}
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                          <span className="text-xs font-bold text-red-400">
                            R$ {itemTotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {/* Controles de Quantidade */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item)}
                            className="w-6 h-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center transition active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddToCart(item)}
                            className="w-6 h-6 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition active:scale-95 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onClearItem(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Observações da Cozinha */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Observações para o Restaurante
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => onChangeNotes(e.target.value)}
                  placeholder="Alguma restrição? Ponto da carne, sem cebola, molho à parte..."
                  rows={2}
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />

                {/* Sugestões Rápidas */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickNotes.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => handleAddQuickNote(qn)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('PIX')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === 'PIX'
                        ? 'border-red-500 bg-red-600/10 text-red-400 shadow-sm'
                        : 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 mb-1 text-emerald-400" />
                    <span>PIX</span>
                    <span className="text-[9px] text-emerald-400 mt-0.5">Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('CARTAO')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === 'CARTAO'
                        ? 'border-red-500 bg-red-600/10 text-red-400 shadow-sm'
                        : 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-sky-400" />
                    <span>Cartão</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Na entrega</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('DINHEIRO')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === 'DINHEIRO'
                        ? 'border-red-500 bg-red-600/10 text-red-400 shadow-sm'
                        : 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1 text-amber-400" />
                    <span>Dinheiro</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Com troco</span>
                  </button>
                </div>
              </div>

              {/* Endereço de Entrega Resumido */}
              <div className="p-3.5 rounded-2xl bg-zinc-800/50 border border-zinc-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 font-semibold block">Entrega em:</span>
                  <span className="font-bold text-zinc-200">Praça Cel. José Vieira, Paraisópolis - MG</span>
                </div>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  30-45 min
                </span>
              </div>
            </>
          )}
        </div>

        {/* Rodapé Fixo */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur space-y-4">
            {/* Detalhamento de Valores */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Taxa de Entrega</span>
                <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-base font-black text-white">
                <span>Total</span>
                <span className="text-red-400">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Aviso se Visitante */}
            {!isAuthenticated && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <span>Conecte sua conta para pedir:</span>
                <button
                  type="button"
                  onClick={() => quickLogin('CUSTOMER')}
                  className="font-bold underline text-amber-400 hover:text-amber-200 ml-2"
                >
                  Entrar (1 Clique)
                </button>
              </div>
            )}

            {/* Botão de Confirmação */}
            <button
              onClick={onConfirmOrder}
              disabled={isLoading || !socketConnected}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-red-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Pedido • R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
};
