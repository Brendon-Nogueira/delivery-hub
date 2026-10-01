import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { MenuItem } from './MenuItemCard';
import { FOOD_VISUAL_MAP } from '../utils/foodImages';
import { useAuth } from '../contexts/AuthContext';
import { useAddress } from '../contexts/AddressContext';

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
  const { address, openAddressModal, formatAddressSummary } = useAddress();

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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* Painel Lateral (Drawer) */}
      <aside className="relative w-full max-w-md h-full bg-white border-l border-zinc-200 text-zinc-900 flex flex-col shadow-drawer z-10 animate-slideLeft">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-white">
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">Sua Sacola</h2>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>Restaurante Paraisópolis</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">Aberto</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition active:scale-90"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4 font-black text-xs uppercase tracking-wider">
                Vazio
              </div>
              <h3 className="text-base font-bold text-zinc-900">Sua sacola está vazia</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1.5 leading-relaxed">
                Adicione itens do cardápio para pedir sua refeição agora mesmo.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 border border-zinc-200 transition active:scale-95"
              >
                Explorar Cardápio
              </button>
            </div>
          ) : (
            <>
              {/* Lista de Itens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Itens Selecionados</span>
                  <span className="text-brand-600 font-black">{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}</span>
                </div>

                {cart.map(({ item, quantity }) => {
                  const numericPrice =
                    typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                  const itemTotal = numericPrice * quantity;
                  const visualMeta = FOOD_VISUAL_MAP[item.id];
                  const photoUrl = item.imageUrl || visualMeta?.fallbackUrl;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 hover:border-zinc-300 transition"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-zinc-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-xs font-black text-brand-500 flex-shrink-0">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-zinc-900 truncate">{item.name}</h4>
                          <span className="text-xs font-black text-brand-600">
                            R$ {itemTotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {/* Controles de Quantidade */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item)}
                            className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-zinc-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddToCart(item)}
                            className="w-6 h-6 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-amber-500 text-white flex items-center justify-center transition active:scale-90 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onClearItem(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Endereço de Entrega Real */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-brand-500" />
                    <span>Endereço de Entrega</span>
                  </div>
                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition active:scale-95 border border-brand-200"
                  >
                    Alterar
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-200 text-xs shadow-xs">
                  <span className="font-bold text-zinc-800 block">
                    {address.street}, {address.number || 'S/N'}
                    {address.complement ? ` (${address.complement})` : ''}
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    {address.neighborhood} • {address.city} - {address.state} • CEP {address.cep}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2.5">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Observações para o Restaurante
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => onChangeNotes(e.target.value)}
                  placeholder="Alguma restrição? Ponto da carne, sem cebola, molho à parte..."
                  rows={2}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />

                {/* Sugestões Rápidas */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickNotes.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => handleAddQuickNote(qn)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 border border-zinc-200 transition active:scale-95"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('PIX')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                      paymentMethod === 'PIX'
                        ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-brand-glow'
                        : 'border-zinc-200/60 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-sm font-black text-zinc-900">PIX</span>
                    <span className="text-[10px] text-emerald-600 mt-0.5 font-semibold">Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('CARTAO')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                      paymentMethod === 'CARTAO'
                        ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-brand-glow'
                        : 'border-zinc-200/60 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-sm font-black text-zinc-900">Cartão</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Na entrega</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangePaymentMethod('DINHEIRO')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                      paymentMethod === 'DINHEIRO'
                        ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-brand-glow'
                        : 'border-zinc-200/60 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-sm font-black text-zinc-900">Dinheiro</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Com troco</span>
                  </button>
                </div>
              </div>

              {/* Endereço de Entrega Resumido */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 font-semibold block text-[10px] uppercase">Entrega em:</span>
                  <span className="font-bold text-zinc-800">Praça Cel. José Vieira, Paraisópolis - MG</span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px]">
                  30-45 min
                </span>
              </div>
            </>
          )}
        </div>

        {/* Rodapé Fixo */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-zinc-100 bg-white space-y-4">
            {/* Detalhamento de Valores */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-700">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Taxa de Entrega</span>
                <span className="font-medium text-emerald-600">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="pt-2.5 border-t border-zinc-100 flex justify-between items-baseline text-base font-black text-zinc-900">
                <span className="text-sm font-bold text-zinc-500">Total a pagar</span>
                <span className="text-xl text-brand-600 font-black">
                  R$ {grandTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Aviso se Visitante */}
            {!isAuthenticated && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                <span>Conecte sua conta para pedir:</span>
                <button
                  type="button"
                  onClick={() => quickLogin('CUSTOMER')}
                  className="font-black underline text-amber-700 hover:text-amber-900 ml-2"
                >
                  Entrar (1 Clique)
                </button>
              </div>
            )}

            {/* Botão de Confirmação */}
            <button
              onClick={onConfirmOrder}
              disabled={isLoading || !socketConnected}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-brand-glow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
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
