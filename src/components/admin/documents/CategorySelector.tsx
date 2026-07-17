import React, { useState } from 'react';
import { Plus, Check, Tag } from 'lucide-react';

export const STANDARD_CATEGORIES = [
  'Documentos pessoais',
  'Contratos',
  'Termos de consentimento',
  'Encaminhamentos',
  'Exames',
  'Receitas',
  'PDFs',
  'Imagens',
  'Áudios',
  'Outros'
];

interface CategorySelectorProps {
  selectedCategory: string;
  onChange: (category: string) => void;
  customCategories?: string[];
  onAddCustomCategory?: (category: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onChange,
  customCategories = [],
  onAddCustomCategory,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categories = [...STANDARD_CATEGORIES, ...customCategories];

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const trimmed = newCategory.trim();
    if (onAddCustomCategory && !categories.includes(trimmed)) {
      onAddCustomCategory(trimmed);
      onChange(trimmed);
    }
    setNewCategory('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-sand-500 uppercase font-mono tracking-wider">
        Categoria do Documento
      </label>
      
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 font-mono ${
                isSelected
                  ? 'bg-softblue-600 border-softblue-600 text-white shadow-sm'
                  : 'bg-white border-sand-200 text-sand-700 hover:border-sand-300 hover:bg-sand-50'
              }`}
            >
              {isSelected && <Check size={12} />}
              <span>{cat}</span>
            </button>
          );
        })}

        {onAddCustomCategory && (
          <div className="inline-flex items-center gap-1">
            {isAdding ? (
              <div className="flex items-center gap-1.5 bg-white border border-sand-250 p-1 rounded-xl">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-2 py-0.5 text-xs focus:outline-none bg-transparent max-w-[120px] font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-sand-300 bg-sand-50/50 hover:bg-sand-50 hover:border-sand-400 text-sand-500 hover:text-sand-700 transition-all cursor-pointer flex items-center gap-1 font-mono"
              >
                <Plus size={12} />
                <span>Nova...</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
