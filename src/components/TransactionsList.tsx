import React, { useState, useMemo } from 'react';
import { Transaction, Category, FlowType } from '../types';
import { LucideIcon } from './Icon';

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onDelete: (id: string) => Promise<void>;
  activeFlow: FlowType | 'combinado';
  maxItems?: number;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onDelete,
  activeFlow,
  maxItems
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos'); // 'YYYY-MM'

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Format date to readable Portuguese format
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${day} de ${months[parseInt(month, 10) - 1]}, ${year}`;
  };

  // Extract unique months for filtering
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      monthsSet.add(t.date.slice(0, 7)); // 'YYYY-MM'
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Combined search and filtering logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Flow Filter
      if (activeFlow !== 'combinado' && t.flowType !== activeFlow) {
        return false;
      }

      // 2. Type Filter
      if (typeFilter !== 'todos' && t.type !== typeFilter) {
        return false;
      }

      // 3. Month Filter
      if (selectedMonth !== 'todos' && t.date.slice(0, 7) !== selectedMonth) {
        return false;
      }

      // 4. Search text
      if (searchTerm.trim() !== '') {
        const text = searchTerm.toLowerCase();
        const category = categories.find(c => c.id === t.categoryId);
        const matchesTitle = t.title.toLowerCase().includes(text);
        const matchesNotes = t.notes?.toLowerCase().includes(text) || false;
        const matchesCategory = category?.name.toLowerCase().includes(text) || false;
        return matchesTitle || matchesNotes || matchesCategory;
      }

      return true;
    });
  }, [transactions, categories, activeFlow, typeFilter, selectedMonth, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col h-full">
      {/* FILTER HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Histórico de Transações</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gerencie seus fluxos financeiros</p>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full self-start sm:self-center font-mono">
            {filteredTransactions.length} lançamentos encontrados
          </span>
        </div>

        {/* INPUT FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* SEARCH BAR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <LucideIcon name="Filter" size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-white"
            />
          </div>

          {/* TYPE FILTER */}
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 bg-white"
          >
            <option value="todos">Todos os lançamentos</option>
            <option value="receita">Apenas Receitas (Entradas)</option>
            <option value="despesa">Apenas Despesas (Saídas)</option>
          </select>

          {/* MONTH FILTER */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 bg-white font-mono"
          >
            <option value="todos">Todos os meses</option>
            {availableMonths.map(m => {
              const [year, month] = m.split('-');
              const monthNames = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
              ];
              return (
                <option key={m} value={m}>
                  {monthNames[parseInt(month, 10) - 1]} / {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* TABLE / LIST */}
      <div className="flex-1 overflow-y-auto max-h-[500px]">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <LucideIcon name="FileSpreadsheet" size={32} className="text-slate-300" />
            <p className="text-xs font-semibold">Nenhuma transação encontrada</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              Experimente alterar os filtros ou adicione uma nova transação à esquerda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(maxItems ? filteredTransactions.slice(0, maxItems) : filteredTransactions).map((t) => {
              const category = categories.find(c => c.id === t.categoryId) || {
                id: 'unknown',
                name: 'Sem categoria',
                color: '#64748b',
                icon: 'HelpCircle',
                flowType: 'ambas'
              };

              return (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-all group">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Category Icon */}
                    <div 
                      className="p-2.5 rounded-xl text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: category.color }}
                    >
                      <LucideIcon name={category.icon} size={18} />
                    </div>

                    {/* Transaction Details */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {t.title}
                        </span>
                        
                        {/* Flow badge */}
                        {activeFlow === 'combinado' && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            t.flowType === 'pessoal' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-slate-900 text-white'
                          }`}>
                            {t.flowType === 'pessoal' ? 'Pessoal' : 'Comércio'}
                          </span>
                        )}

                        {/* OCR Indicator */}
                        {t.receiptName && (
                          <span 
                            title={`Extraído via IA do arquivo: ${t.receiptName}`}
                            className="inline-flex items-center text-emerald-600 bg-emerald-50 text-[9px] font-bold px-1 py-0.5 rounded-md"
                          >
                            <LucideIcon name="Sparkles" size={8} className="mr-0.5" /> PDF
                          </span>
                        )}
                      </div>

                      {/* Sub-info */}
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-slate-400 font-medium flex-wrap">
                        <span className="font-semibold text-slate-500">{category.name}</span>
                        <span>•</span>
                        <span>{formatDate(t.date)}</span>
                        
                        {/* Payment Method Badge */}
                        <span>•</span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          t.paymentMethod === 'pix' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                          t.paymentMethod === 'cartao_credito' || t.paymentMethod === 'cartao_debito' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          t.paymentMethod === 'dinheiro' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          {t.paymentMethod === 'pix' && '⚡ PIX'}
                          {t.paymentMethod === 'cartao_credito' && '💳 Crédito'}
                          {t.paymentMethod === 'cartao_debito' && '💳 Débito'}
                          {t.paymentMethod === 'dinheiro' && '💵 Dinheiro'}
                          {(t.paymentMethod === 'outro' || !t.paymentMethod) && '🔄 Outro'}
                        </span>

                        {/* Closure status */}
                        <span>•</span>
                        {t.isClosed ? (
                          <span className="inline-flex items-center text-[8px] text-blue-600 bg-blue-50/50 border border-blue-100/50 px-1 py-0.5 rounded-sm font-bold">
                            🔒 Fechado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[8px] text-amber-600 bg-amber-50/50 border border-amber-100/50 px-1 py-0.5 rounded-sm font-bold">
                            🔓 Aberto
                          </span>
                        )}

                        {t.notes && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-[120px] sm:max-w-xs">{t.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Amount */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`text-xs font-extrabold font-mono ${
                      t.type === 'receita' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LucideIcon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
