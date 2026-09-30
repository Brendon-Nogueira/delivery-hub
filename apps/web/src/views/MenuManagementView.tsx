import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  Sparkles,
  UtensilsCrossed,
  DollarSign,
  Tag,
  FileText,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MenuManagementViewProps {
  restaurantId: string | null;
}

/** Sugestões de imagens prontas para facilitar o cadastro no demo */
const SAMPLE_IMAGES = [
  { label: 'Smash Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop' },
  { label: 'Bacon Burger', url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop' },
  { label: 'Batata Rústica', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop' },
  { label: 'Onion Rings', url: 'https://images.unsplash.com/photo-1639024471287-032f66e5f1b5?w=600&auto=format&fit=crop' },
  { label: 'Refrigerante Cola', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop' },
  { label: 'Milkshake Chocolate', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop' },
];

const PRESET_CATEGORIES = ['Lanches', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Combos'];

export const MenuManagementView: React.FC<MenuManagementViewProps> = ({ restaurantId }) => {
  const { addToast } = useToast();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterAvailability, setFilterAvailability] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Lanches',
    imageUrl: '',
    isAvailable: true,
  });

  // Modal 
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /**
   * CONCEITO: Carregamento do cardápio completo do proprietário
   * O endpoint `GET /menu/restaurant/:id/all` inclui itens com isAvailable=false,
   * permitindo ao dono gerenciar estoque e visibilidade.
   */
  const loadMenu = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const data = await apiFetch<MenuItem[]>(`/api/v1/menu/restaurant/${restaurantId}/all`);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      addToast({
        title: 'Erro ao carregar cardápio',
        message: err.message || 'Verifique se você está autenticado como Restaurante.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  // Categorias disponíveis calculadas a partir dos itens cadastrados + presets
  const categories = useMemo(() => {
    const fromItems = items.map((i) => i.category).filter(Boolean);
    const set = new Set([...PRESET_CATEGORIES, ...fromItems]);
    return Array.from(set);
  }, [items]);

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchAvailability =
        filterAvailability === 'ALL' ||
        (filterAvailability === 'AVAILABLE' && item.isAvailable) ||
        (filterAvailability === 'UNAVAILABLE' && !item.isAvailable);

      return matchSearch && matchCategory && matchAvailability;
    });
  }, [items, searchTerm, selectedCategory, filterAvailability]);

  // Abrir modal para novo item
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: categories[0] || 'Lanches',
      imageUrl: '',
      isAvailable: true,
    });
    setIsModalOpen(true);
  };

  // Abrir modal para edição
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable,
    });
    setIsModalOpen(true);
  };

  /**
   * CONCEITO: 
   * Alterna a disponibilidade do item imediatamente na UI.
   * Se a requisição falhar, reverte para o valor original.
   */
  const handleToggleAvailability = async (item: MenuItem) => {
    const originalState = item.isAvailable;
    const newState = !originalState;

    // Atualização  local
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newState } : i))
    );

    try {
      await apiFetch(`/api/v1/menu/${item.id}/toggle`, { method: 'PATCH' });
      addToast({
        title: newState ? 'Item Ativado' : 'Item Pausado',
        message: `${item.name} agora está ${newState ? 'visível no cardápio' : 'marcado como esgotado'}.`,
        type: 'success',
      });
    } catch (err: any) {
      // Rollback em caso de erro
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: originalState } : i))
      );
      addToast({
        title: 'Falha ao alterar status',
        message: err.message || 'Tente novamente.',
        type: 'error',
      });
    }
  };

  // (Create ou Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    const parsedPrice = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      addToast({
        title: 'Preço inválido',
        message: 'Informe um valor numérico maior que zero.',
        type: 'error',
      });
      return;
    }

    if (!formData.name.trim()) {
      addToast({
        title: 'Nome obrigatório',
        message: 'O nome do prato não pode ficar em branco.',
        type: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parsedPrice,
        category: formData.category.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        // PATCH
        const updated = await apiFetch<MenuItem>(`/api/v1/menu/${editingItem.id}`, {
          method: 'PATCH',
          data: payload,
        });

        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i))
        );

        addToast({
          title: 'Item Atualizado',
          message: `${formData.name} foi atualizado com sucesso.`,
          type: 'success',
        });
      } else {
        // POST
        const created = await apiFetch<MenuItem>(`/api/v1/menu/${restaurantId}`, {
          method: 'POST',
          data: payload,
        });

        setItems((prev) => [created, ...prev]);

        addToast({
          title: 'Item Criado',
          message: `${formData.name} adicionado ao cardápio!`,
          type: 'success',
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      addToast({
        title: 'Erro ao salvar item',
        message: err.message || 'Verifique os dados informados.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/v1/menu/${itemToDelete.id}`, { method: 'DELETE' });

      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));

      addToast({
        title: 'Item Removido',
        message: `${itemToDelete.name} foi removido com sucesso.`,
        type: 'success',
      });
      setItemToDelete(null);
    } catch (err: any) {
      addToast({
        title: 'Erro ao excluir item',
        message: err.message || 'Não foi possível deletar o item.',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Cardápio */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Gestão do Cardápio
            </h2>
          </div>
          <p className="text-sm text-zinc-500">
            Cadastre novos pratos, ajuste preços e controle a disponibilidade em tempo real para os clientes.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
          <p className="text-xs font-medium text-zinc-500">Total de Itens</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
          <p className="text-xs font-medium text-emerald-600">Disponíveis</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {items.filter((i) => i.isAvailable).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
          <p className="text-xs font-medium text-amber-600">Pausados / Esgotados</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {items.filter((i) => !i.isAvailable).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
          <p className="text-xs font-medium text-zinc-500">Categorias</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{categories.length}</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterAvailability('ALL')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                filterAvailability === 'ALL'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setFilterAvailability('AVAILABLE')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                filterAvailability === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setFilterAvailability('UNAVAILABLE')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                filterAvailability === 'UNAVAILABLE'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Desabilitar
            </button>
          </div>
        </div>

        {/* Categoria Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Itens */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-xl p-4 border border-zinc-200/80 animate-pulse space-y-3"
            >
              <div className="h-36 bg-zinc-200 rounded-lg"></div>
              <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200/80">
          <UtensilsCrossed className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-800">Nenhum item encontrado</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'ALL' || filterAvailability !== 'ALL'
              ? 'Nenhum prato corresponde aos filtros selecionados. Tente limpar os filtros.'
              : 'Seu cardápio ainda não tem nenhum item cadastrado. Clique no botão abaixo para adicionar!'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Prato
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                item.isAvailable ? 'border-zinc-200/80' : 'border-amber-200/80 bg-zinc-50/50 opacity-80'
              }`}
            >
              <div>
                {/* Imagem + Badges */}
                <div className="relative h-44 bg-zinc-100 overflow-hidden group">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-100">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">Sem foto</span>
                    </div>
                  )}

                  {/* Badge de Categoria */}
                  <span className="absolute top-3 left-3 bg-zinc-900/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                    {item.category}
                  </span>

                  {/* Badge de Disponibilidade */}
                  <span
                    className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${
                      item.isAvailable
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-amber-500/90 text-white'
                    }`}
                  >
                    {item.isAvailable ? 'Disponível' : 'Esgotado'}
                  </span>
                </div>

                {/* Conteúdo do Item */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-zinc-900 text-base leading-tight">
                      {item.name}
                    </h3>
                    <span className="font-extrabold text-brand-600 text-base shrink-0">
                      R$ {Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  {item.description ? (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Sem descrição detalhada.</p>
                  )}
                </div>
              </div>

              {/* Barra de Ações Rápidas */}
              <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                {/* Botão de Toggle Disponibilidade */}
                <button
                  onClick={() => handleToggleAvailability(item)}
                  title={item.isAvailable ? 'Pausar venda' : 'Ativar venda'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    item.isAvailable
                      ? 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {item.isAvailable ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-500" /> Pausar
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" /> Ativar
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  {/* Editar */}
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    title="Editar informações"
                    className="p-1.5 text-zinc-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => setItemToDelete(item)}
                    title="Excluir item"
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Criar / Editar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                  <UtensilsCrossed className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-zinc-900 text-lg">
                  {editingItem ? 'Editar Prato' : 'Novo Prato no Cardápio'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" /> Nome do Prato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Smash Burger Cheddar Duplo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Preço e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="34.90"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" /> Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    placeholder="Lanches"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <datalist id="category-suggestions">
                    {PRESET_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" /> Ingredientes / Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Pão brioche artesanal, 2x smash burger de 90g, queijo cheddar inglês derretido e maionese defumada."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              {/* URL da Imagem */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" /> URL da Imagem (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />

                {/* Sugestões de imagens rápidas para o demo */}
                <div className="mt-2">
                  <p className="text-[11px] text-zinc-400 font-medium mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-500" /> Sugestões para teste rápido:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: img.url })}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-brand-50 hover:text-brand-600 text-zinc-600 transition"
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview da foto se existir */}
                {formData.imageUrl && (
                  <div className="mt-3 relative h-28 rounded-lg overflow-hidden border border-zinc-200">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Checkbox de Disponibilidade Inicial */}
              <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-zinc-300"
                />
                <span className="text-xs font-semibold text-zinc-700">
                  Item disponível imediatamente para pedidos no cardápio
                </span>
              </label>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Prato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 rounded-full bg-rose-50">
                <AlertCircle className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-zinc-900 text-base">Remover Item</h3>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed">
              Tem certeza que deseja excluir <strong>{itemToDelete.name}</strong>? Se o item já tiver
              pedidos no histórico, ele será arquivado como indisponível.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
