import React, { useState, useEffect } from 'react';
import { Category, FlowType } from '../types';
import { LucideIcon } from './Icon';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Omit<Category, 'id' | 'isSystem'>) => Promise<void>;
  defaultFlowType?: FlowType | 'ambas';
  categories?: Category[];
  onDeleteCategory?: (id: string) => Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
  defaultFlowType = 'pessoal',
  categories = [],
  onDeleteCategory
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'manage'>('create');
  const [name, setName] = useState('');
  const [flowType, setFlowType] = useState<FlowType | 'ambas'>(defaultFlowType);
  const [selectedIcon, setSelectedIcon] = useState('HelpCircle');
  const [selectedColor, setSelectedColor] = useState('#64748b'); // Default Gray
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset errors and fields on open
  useEffect(() => {
    if (isOpen) {
      setName('');
      // Standardize 'combinado' context to default to 'pessoal'
      setFlowType(defaultFlowType === 'combinado' ? 'pessoal' : defaultFlowType);
      setSelectedIcon('HelpCircle');
      setSelectedColor('#64748b');
      setError(null);
      setActiveSubTab('create');
    }
  }, [isOpen, defaultFlowType]);

  if (!isOpen) return null;

  const availableIcons = [
    'Utensils', 'ShoppingCart', 'Box', 'Car', 'Home', 
    'Building', 'Sparkles', 'Megaphone', 'Receipt', 
    'HeartPulse', 'HelpCircle', 'Briefcase', 'Layers', 
    'TrendingUp', 'TrendingDown', 'Gift'
  ];

  const availableColors = [
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Slate', hex: '#64748b' },
    { name: 'Black', hex: '#0f172a' },
    { name: 'Teal', hex: '#14b8a6' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddCategory({
        name: name.trim(),
        flowType: flowType === 'ambas' ? 'ambas' : flowType,
        icon: selectedIcon,
        color: selectedColor
      });
      setName('');
      setSelectedIcon('HelpCircle');
      setSelectedColor('#64748b');
      onClose();
    } catch (err: any) {
      console.error('Erro ao adicionar categoria:', err);
      setError(err?.message || 'Falha ao salvar categoria no banco de dados. Verifique se o preenchimento está correto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteCategory) return;
    try {
      setError(null);
      await onDeleteCategory(id);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir categoria.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <LucideIcon name="Layers" size={18} className="text-blue-600" />
            Gerenciador de Categorias
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        {/* SUB TABS */}
        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('create')}
            className={`flex-1 py-3 text-xs font-bold text-center transition-all border-b-2 ${
              activeSubTab === 'create'
                ? 'border-slate-800 text-slate-800 bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            Nova Categoria
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('manage')}
            className={`flex-1 py-3 text-xs font-bold text-center transition-all border-b-2 ${
              activeSubTab === 'manage'
                ? 'border-slate-800 text-slate-800 bg-white'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            Excluir Categorias
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 p-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-4">
              <LucideIcon name="AlertTriangle" size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {activeSubTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* CATEGORY NAME */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinaturas, Combustível Loja..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50 font-medium text-slate-800"
                />
              </div>

              {/* DESTINATION FLOW TYPE */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Disponível em
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlowType('pessoal')}
                    className={`py-2 text-[11px] font-semibold border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      flowType === 'pessoal'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LucideIcon name="User" size={14} />
                    Pessoal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowType('comercio')}
                    className={`py-2 text-[11px] font-semibold border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      flowType === 'comercio'
                        ? 'border-slate-800 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LucideIcon name="Briefcase" size={14} />
                    Comércio
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowType('ambas')}
                    className={`py-2 text-[11px] font-semibold border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      flowType === 'ambas'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LucideIcon name="Layers" size={14} />
                    Ambos
                  </button>
                </div>
              </div>

              {/* ICON SELECTOR */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Selecione o Ícone
                </label>
                <div className="grid grid-cols-8 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-24 overflow-y-auto no-scrollbar">
                  {availableIcons.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setSelectedIcon(iconName)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        selectedIcon === iconName 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-100'
                      }`}
                    >
                      <LucideIcon name={iconName} size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR SELECTOR */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Selecione a Cor
                </label>
                <div className="grid grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {availableColors.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSelectedColor(color.hex)}
                      title={color.name}
                      className={`w-full h-8 rounded-lg transition-all border shrink-0 ${
                        selectedColor === color.hex 
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-105' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* SUBMIT */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Salvar Categoria
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <p className="text-[11px] text-slate-500 font-medium mb-3 leading-relaxed">
                Clique na lixeira para excluir qualquer categoria. Lançamentos que usam essa categoria passarão a exibir "Sem categoria".
              </p>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <LucideIcon name="Layers" size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">Nenhuma categoria encontrada.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div 
                          className="p-2 rounded-lg text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          <LucideIcon name={cat.icon} size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{cat.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                              cat.flowType === 'pessoal' 
                                ? 'bg-blue-50 text-blue-600' 
                                : cat.flowType === 'comercio' 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {cat.flowType === 'pessoal' ? 'Pessoal' : cat.flowType === 'comercio' ? 'Comércio' : 'Ambos'}
                            </span>
                            <span className="text-[8px] text-slate-400">
                              {cat.isSystem ? 'Padrão' : 'Personalizada'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Excluir Categoria"
                      >
                        <LucideIcon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
