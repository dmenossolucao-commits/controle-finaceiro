import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, FlowType, Bank } from '../types';
import { LucideIcon } from './Icon';
import { motion, AnimatePresence } from 'motion/react';
import { getBanks, addBank, updateBank, resetTransactionsAndSetInitialBalance } from '../lib/dbService';
import { safeStorage } from '../lib/safeStorage';

interface FinancialChartsProps {
  transactions: Transaction[];
  categories: Category[];
  activeFlow: FlowType | 'combinado';
  onNavigateTab?: (tab: string) => void;
  onRefreshTransactions?: () => Promise<void>;
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  transactions,
  categories,
  activeFlow,
  onNavigateTab,
  onRefreshTransactions
}) => {
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'year' | 'currentMonth'>('6months');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);

  // Movimentações view states (Revenue, Expense, Net Balance)
  const [selectedMovementType, setSelectedMovementType] = useState<'receita' | 'despesa' | 'saldo' | null>(null);
  const [movementsSearchTerm, setMovementsSearchTerm] = useState('');

  // Reset Dashboard states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetInitialBalance, setResetInitialBalance] = useState('');
  const [resetFlowType, setResetFlowType] = useState<'pessoal' | 'comercio' | 'ambos'>(
    activeFlow === 'combinado' ? 'pessoal' : activeFlow
  );
  const [isResetting, setIsResetting] = useState(false);

  // Bank & Balance States
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [quickEditBankId, setQuickEditBankId] = useState<string | null>(null);
  const [quickBalanceVal, setQuickBalanceVal] = useState('');
  const [isAddingNewBank, setIsAddingNewBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankType, setNewBankType] = useState<'digital' | 'tradicional' | 'carteira' | 'outro'>('digital');
  const [newBankBalance, setNewBankBalance] = useState('');
  const [newBankColor, setNewBankColor] = useState('#3b82f6');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showBalances, setShowBalances] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('show_balances');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const toggleShowBalances = () => {
    setShowBalances(prev => {
      const next = !prev;
      try {
        safeStorage.setItem('show_balances', String(next));
      } catch (e) {}
      return next;
    });
  };

  const loadBanksData = async () => {
    setLoadingBanks(true);
    try {
      const fetched = await getBanks();
      setBanks(fetched);
    } catch (err) {
      console.error('Erro ao carregar bancos no painel:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    loadBanksData();
  }, []);

  const handleQuickAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newBankBalance.trim()) return;
    const bal = parseFloat(newBankBalance.replace(',', '.'));
    if (isNaN(bal)) {
      showLocalToast('Saldo inválido.');
      return;
    }
    try {
      const added = await addBank({
        name: newBankName.trim(),
        type: newBankType,
        balance: bal,
        color: newBankColor
      });
      setBanks(prev => [...prev, added]);
      setNewBankName('');
      setNewBankBalance('');
      setIsAddingNewBank(false);
      showLocalToast('Nova conta criada com saldo inicial!');
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      showLocalToast('Erro ao criar conta.');
    }
  };

  const handleQuickUpdateBalance = async (bankId: string) => {
    const bal = parseFloat(quickBalanceVal.replace(',', '.'));
    if (isNaN(bal)) {
      showLocalToast('Saldo inválido.');
      return;
    }
    try {
      await updateBank(bankId, { balance: bal });
      setBanks(prev => prev.map(b => b.id === bankId ? { ...b, balance: bal } : b));
      setQuickEditBankId(null);
      setQuickBalanceVal('');
      showLocalToast('Saldo inicial ajustado!');
    } catch (err) {
      console.error('Erro ao atualizar saldo:', err);
      showLocalToast('Erro ao atualizar saldo.');
    }
  };

  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleResetDashboard = async () => {
    setIsResetting(true);
    try {
      const amount = parseFloat(resetInitialBalance.replace(',', '.')) || 0;
      await resetTransactionsAndSetInitialBalance(amount, resetFlowType);
      
      showLocalToast('Painel zerado com sucesso! Novo período iniciado.');
      setIsResetModalOpen(false);
      setResetInitialBalance('');
      if (onRefreshTransactions) {
        await onRefreshTransactions();
      }
    } catch (err) {
      console.error(err);
      showLocalToast('Erro ao zerar o painel.');
    } finally {
      setIsResetting(false);
    }
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    if (!showBalances) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filter transactions based on selected flow
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeFlow === 'combinado') return true;
      return t.flowType === activeFlow;
    });
  }, [transactions, activeFlow]);

  // Extract monthly data
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { monthKey: string; name: string; receita: number; despesa: number }> = {};
    
    // Sort transactions chronologically
    const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));

    // Get list of last 6 months or current year
    let referenceDate = new Date();
    if (filteredTransactions.length > 0) {
      const dates = filteredTransactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        if (maxDate > referenceDate) {
          referenceDate = maxDate;
        }
      }
    }
    const monthsToInclude: string[] = [];

    if (chartPeriod === 'currentMonth') {
      const currentMonthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
      monthsToInclude.push(currentMonthKey);
    } else if (chartPeriod === '6months') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsToInclude.push(mKey);
      }
    } else {
      // Full year
      for (let i = 11; i >= 0; i--) {
        const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsToInclude.push(mKey);
      }
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    monthsToInclude.forEach(mKey => {
      const [year, month] = mKey.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      monthsMap[mKey] = {
        monthKey: mKey,
        name: `${monthNames[monthIdx]} / ${year.slice(2)}`,
        receita: 0,
        despesa: 0
      };
    });

    sorted.forEach(t => {
      const mKey = t.date.slice(0, 7); // 'YYYY-MM'
      if (monthsMap[mKey]) {
        if (t.type === 'receita') {
          monthsMap[mKey].receita += t.amount;
        } else {
          monthsMap[mKey].despesa += t.amount;
        }
      }
    });

    return Object.values(monthsMap);
  }, [filteredTransactions, chartPeriod]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const expenseTx = filteredTransactions.filter(t => t.type === 'despesa');
    const totalsByCategory: Record<string, { amount: number; category: Category }> = {};

    expenseTx.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId) || {
        id: 'unknown',
        name: 'Sem categoria',
        color: '#94a3b8',
        icon: 'HelpCircle',
        flowType: 'ambas'
      };
      
      if (!totalsByCategory[cat.id]) {
        totalsByCategory[cat.id] = { amount: 0, category: cat };
      }
      totalsByCategory[cat.id].amount += t.amount;
    });

    const list = Object.values(totalsByCategory).sort((a, b) => b.amount - a.amount);
    const totalExpense = list.reduce((sum, item) => sum + item.amount, 0);

    return list.map(item => ({
      ...item,
      percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
    }));
  }, [filteredTransactions, categories]);

  // Overall calculations for the active period/flow
  const totals = useMemo(() => {
    let receita = 0;
    let despesa = 0;

    filteredTransactions.forEach(t => {
      // If we are looking at 6months or year, let's filter if needed, otherwise calculate all
      if (t.type === 'receita') {
        receita += t.amount;
      } else {
        despesa += t.amount;
      }
    });

    return {
      receita,
      despesa,
      saldo: receita - despesa
    };
  }, [filteredTransactions]);

  // Filter and search movements list
  const movementsList = useMemo(() => {
    if (!selectedMovementType) return [];
    
    // Filter by type: receita, despesa, or all (saldo)
    let list = filteredTransactions;
    if (selectedMovementType === 'receita') {
      list = filteredTransactions.filter(t => t.type === 'receita');
    } else if (selectedMovementType === 'despesa') {
      list = filteredTransactions.filter(t => t.type === 'despesa');
    }
    
    // Apply search filter if any
    if (movementsSearchTerm.trim()) {
      const term = movementsSearchTerm.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }
    
    // Sort chronologically reverse (newest first)
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions, selectedMovementType, movementsSearchTerm]);

  // Calculate sum of current filtered movements
  const movementsSum = useMemo(() => {
    return movementsList.reduce((sum, t) => {
      if (t.type === 'receita') {
        return sum + t.amount;
      } else {
        return sum - t.amount;
      }
    }, 0);
  }, [movementsList]);

  // Chart rendering constants
  const maxBarValue = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map(d => Math.max(d.receita, d.despesa)), 100);
    return maxVal * 1.15; // 15% extra height space
  }, [monthlyData]);

  // SVG parameters for Category Donut Chart
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  
  const donutSlices = useMemo(() => {
    let accumulatedAngle = 0;
    return categoryBreakdown.map((item, idx) => {
      const percentage = item.percentage;
      const strokeLength = (percentage / 100) * donutCircumference;
      const strokeOffset = donutCircumference - strokeLength + accumulatedAngle;
      accumulatedAngle -= strokeLength;
      
      return {
        ...item,
        strokeLength,
        strokeOffset
      };
    });
  }, [categoryBreakdown, donutCircumference]);

  const pendingCommerceRevenues = useMemo(() => {
    return transactions.filter(t => !t.isClosed && t.type === 'receita' && t.flowType === 'comercio');
  }, [transactions]);

  const pendingCommerceExpenses = useMemo(() => {
    return transactions.filter(t => !t.isClosed && t.type === 'despesa' && t.flowType === 'comercio');
  }, [transactions]);

  const totalPendingCommerceRevenues = useMemo(() => {
    return pendingCommerceRevenues.reduce((sum, t) => sum + t.amount, 0);
  }, [pendingCommerceRevenues]);

  return (
    <>
      {/* WELCOME & EYE TOGGLE HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
            Painel Geral de Controle
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Acompanhe seus saldos, receitas e despesas com privacidade e facilidade.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setResetFlowType(activeFlow === 'combinado' ? 'pessoal' : activeFlow);
              setIsResetModalOpen(true);
            }}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-3xs border border-rose-100"
            title="Zerar o painel inicial e iniciar um novo período com saldo inicial"
          >
            <LucideIcon name="RefreshCw" size={14} className="stroke-[2.5]" />
            Zerar Painel / Novo Mês
          </button>

          <button
            type="button"
            onClick={toggleShowBalances}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-3xs border border-slate-200/50"
            title={showBalances ? "Ocultar todos os saldos" : "Mostrar todos os saldos"}
          >
            <LucideIcon name={showBalances ? "EyeOff" : "Eye"} size={14} className="stroke-[2.5]" />
            {showBalances ? "Ocultar Valores" : "Mostrar Valores"}
          </button>
        </div>
      </div>

      {/* DASHBOARD INTEGRATED CASH CLOSURE ALERT FOR COMMERCE */}
      {(activeFlow === 'comercio' || activeFlow === 'combinado') && onNavigateTab && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200 rounded-2xl p-5 mb-6 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl shrink-0">
              <LucideIcon name="Lock" size={20} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                Fechamento de Caixa Diário do Comércio
                <span className="bg-amber-200 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Disponível
                </span>
              </h4>
              <p className="text-[11px] text-amber-800/80 leading-relaxed max-w-2xl">
                Seu caixa comercial possui{' '}
                <strong className="text-amber-950 font-black">{pendingCommerceRevenues.length} receitas</strong> e{' '}
                <strong className="text-amber-950 font-black">{pendingCommerceExpenses.length} vales/saídas</strong> em aberto, totalizando{' '}
                <strong className="text-amber-950 font-mono font-black">{formatCurrency(totalPendingCommerceRevenues)}</strong> bruto pendente de fechamento. 
                Feche diariamente para direcionar e sincronizar os valores para as contas corretas (Cofre, Pix e Cartões).
              </p>
            </div>
          </div>
          
          <button
            onClick={() => onNavigateTab('fechamento')}
            className="w-full md:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer border border-amber-700/20 active:scale-[0.98]"
          >
            <LucideIcon name="ArrowRight" size={13} className="stroke-[2.5]" />
            Ir para Fechamento de Caixa
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* COLUMN 1 & 2: Overview and Bar Chart */}
      <div className="lg:col-span-2 flex flex-col space-y-6">
        
        {/* Card de Totais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Receita */}
          <div 
            onClick={() => {
              setMovementsSearchTerm('');
              setSelectedMovementType('receita');
            }}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
            title="Clique para ver o histórico de receitas"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receitas</span>
              <h4 className="text-2xl font-bold text-emerald-600 font-sans tracking-tight flex items-center gap-1.5">
                {formatCurrency(totals.receita)}
                <LucideIcon name="ArrowUpRight" size={14} className="opacity-40" />
              </h4>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
              <LucideIcon name="TrendingUp" size={24} />
            </div>
          </div>

          {/* Card Despesa */}
          <div 
            onClick={() => {
              setMovementsSearchTerm('');
              setSelectedMovementType('despesa');
            }}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-200 hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
            title="Clique para ver o histórico de despesas"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Despesas</span>
              <h4 className="text-2xl font-bold text-rose-600 font-sans tracking-tight flex items-center gap-1.5">
                {formatCurrency(totals.despesa)}
                <LucideIcon name="ArrowDownRight" size={14} className="opacity-40" />
              </h4>
            </div>
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
              <LucideIcon name="TrendingDown" size={24} />
            </div>
          </div>

          {/* Card Saldo */}
          <div 
            onClick={() => {
              setMovementsSearchTerm('');
              setSelectedMovementType('saldo');
            }}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
            title="Clique para ver todas as movimentações"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Líquido</span>
              <h4 className={`text-2xl font-bold font-sans tracking-tight flex items-center gap-1.5 ${totals.saldo >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                {formatCurrency(totals.saldo)}
                <LucideIcon name="ArrowUpRight" size={14} className="opacity-40" />
              </h4>
            </div>
            <div className={`p-3 rounded-xl ${totals.saldo >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              <LucideIcon name="DollarSign" size={24} />
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Mensal */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex-1 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Evolução Mensal</h3>
              <p className="text-xs text-slate-500 mt-1">Comparativo de entradas e saídas no período</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
              <button
                onClick={() => setChartPeriod('6months')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartPeriod === '6months' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                6 Meses
              </button>
              <button
                onClick={() => setChartPeriod('year')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartPeriod === 'year' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                12 Meses
              </button>
            </div>
          </div>

          {/* Renderização do Gráfico em SVG Responsivo */}
          <div className="relative h-64 flex items-end w-full px-2 pt-6">
            {monthlyData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <LucideIcon name="BarChart" size={36} className="text-slate-300 mb-2" />
                <span className="text-xs">Nenhum dado financeiro para exibir</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-end">
                {/* As Barras */}
                <div className="flex-1 flex items-end justify-between px-2 gap-4 sm:gap-6 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-slate-100">
                    <div className="w-full border-t border-dashed border-slate-100 h-0"></div>
                    <div className="w-full border-t border-dashed border-slate-100 h-0"></div>
                    <div className="w-full border-t border-dashed border-slate-100 h-0"></div>
                  </div>

                  {monthlyData.map((data, index) => {
                    const recHeight = (data.receita / maxBarValue) * 100;
                    const despHeight = (data.despesa / maxBarValue) * 100;

                    return (
                      <div 
                        key={data.monthKey} 
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        onMouseEnter={() => setHoveredBarIndex(index)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Tooltip */}
                        {hoveredBarIndex === index && (
                          <div className="absolute bottom-full mb-3 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-lg z-20 w-44 pointer-events-none transition-all">
                            <p className="font-semibold text-center border-b border-slate-700 pb-1 mb-1">{data.name}</p>
                            <div className="flex justify-between mt-1">
                              <span className="text-emerald-400">Receitas:</span>
                              <span className="font-mono">{formatCurrency(data.receita)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-rose-400">Despesas:</span>
                              <span className="font-mono">{formatCurrency(data.despesa)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-700 mt-1 pt-1 font-semibold">
                              <span>Líquido:</span>
                              <span className={data.receita - data.despesa >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {formatCurrency(data.receita - data.despesa)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Duas barras */}
                        <div className="flex items-end w-full justify-center space-x-1.5 sm:space-x-3 h-full">
                          {/* Barra Receita */}
                          <div className="w-3 sm:w-5 h-full flex items-end relative">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${recHeight}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="w-full bg-emerald-500 rounded-t-md hover:brightness-110 hover:shadow-md transition-all cursor-pointer min-h-[2px]"
                            />
                          </div>
                          {/* Barra Despesa */}
                          <div className="w-3 sm:w-5 h-full flex items-end relative">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${despHeight}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="w-full bg-rose-500 rounded-t-md hover:brightness-110 hover:shadow-md transition-all cursor-pointer min-h-[2px]"
                            />
                          </div>
                        </div>

                        {/* Label do Mês */}
                        <span className="text-[10px] sm:text-xs font-medium text-slate-500 mt-3 truncate max-w-full">
                          {data.name.split(' / ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 3: Expenses Donut Chart & Saldos Iniciais Card */}
      <div className="flex flex-col space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Distribuição por Categoria</h3>
            <p className="text-xs text-slate-500 mt-1">Onde você está gastando mais recursos</p>
          </div>

          {/* Donut Content */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                <LucideIcon name="PieChart" size={36} className="text-slate-300 mb-2" />
                <span className="text-xs">Nenhuma despesa para<br />verificar a distribuição</span>
              </div>
            ) : (
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* Donut Chart SVG */}
                <svg width="100%" height="100%" viewBox="0 0 120 120" className="-rotate-90">
                  {donutSlices.map((slice, index) => {
                    const isHovered = hoveredSliceIndex === index;
                    return (
                      <circle
                        key={slice.category.id}
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.category.color}
                        strokeWidth={isHovered ? 14 : 10}
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={slice.strokeOffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredSliceIndex(index)}
                        onMouseLeave={() => setHoveredSliceIndex(null)}
                      />
                    );
                  })}
                </svg>

                {/* Central Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                  {hoveredSliceIndex !== null ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">
                        {donutSlices[hoveredSliceIndex].category.name}
                      </span>
                      <span className="text-base font-extrabold text-slate-800 font-mono">
                        {donutSlices[hoveredSliceIndex].percentage.toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Saídas</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">
                        {formatCurrency(totals.despesa)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {categoryBreakdown.length > 0 && (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {categoryBreakdown.slice(0, 5).map((item, idx) => (
                <div 
                  key={item.category.id} 
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                    hoveredSliceIndex === idx ? 'bg-slate-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredSliceIndex(idx)}
                  onMouseLeave={() => setHoveredSliceIndex(null)}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="text-xs font-semibold text-slate-600 truncate">
                      {item.category.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                      ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
              {categoryBreakdown.length > 5 && (
                <p className="text-[10px] text-slate-400 text-center pt-1 italic">
                  + {categoryBreakdown.length - 5} outras categorias
                </p>
              )}
            </div>
          )}
        </div>

        {/* BANCO CARD: SALDOS INICIAIS & CONTAS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <LucideIcon name="Briefcase" size={15} className="text-blue-600" />
                Saldos Iniciais & Contas
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Inicie suas contas com o saldo que possui hoje.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsAddingNewBank(!isAddingNewBank)}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border border-blue-100/50"
            >
              <LucideIcon name={isAddingNewBank ? "X" : "Plus"} size={11} className="stroke-[3]" />
              {isAddingNewBank ? "Fechar" : "Nova Conta"}
            </button>
          </div>

          {/* Quick toast inside card */}
          {toastMessage && (
            <div className="bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg text-center font-bold animate-fade-in shadow-sm">
              {toastMessage}
            </div>
          )}

          {/* Add Bank Form */}
          {isAddingNewBank && (
            <form onSubmit={handleQuickAddBank} className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2.5 animate-slide-down">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cadastrar Nova Conta</h4>
              
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nome da Conta / Banco</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank, Caixa Geral"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                  <select
                    value={newBankType}
                    onChange={(e) => setNewBankType(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="digital">Digital</option>
                    <option value="tradicional">Tradicional</option>
                    <option value="carteira">Dinheiro</option>
                    <option value="outro">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Saldo Inicial (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={newBankBalance}
                    onChange={(e) => setNewBankBalance(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cor:</label>
                  <input
                    type="color"
                    value={newBankColor}
                    onChange={(e) => setNewBankColor(e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 overflow-hidden"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewBank(false)}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Banks list */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {banks.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 py-4 font-medium">Nenhum banco ou caixa cadastrado.</p>
            ) : (
              banks.map(b => {
                const isEditing = quickEditBankId === b.id;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-slate-700 block truncate">{b.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {b.type === 'digital' && '⚡ Digital'}
                          {b.type === 'tradicional' && '🏦 Tradicional'}
                          {b.type === 'carteira' && '💵 Dinheiro'}
                          {b.type === 'outro' && '🔄 Outros'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={quickBalanceVal}
                            onChange={(e) => setQuickBalanceVal(e.target.value)}
                            className="w-16 text-xs font-mono font-bold px-1.5 py-0.5 rounded-md border border-slate-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickUpdateBalance(b.id)}
                            className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 cursor-pointer animate-pulse"
                          >
                            <LucideIcon name="Check" size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickEditBankId(null)}
                            className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 cursor-pointer"
                          >
                            <LucideIcon name="X" size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {formatCurrency(b.balance)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickEditBankId(b.id);
                              setQuickBalanceVal(b.balance.toString());
                            }}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Ajustar saldo inicial"
                          >
                            <LucideIcon name="Edit3" size={11} className="stroke-[2.5]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>

      {/* TOAST SYSTEM (LOCAL BACKUP) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 bg-slate-900 text-white border border-slate-800 rounded-xl px-4 py-3 shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-bounce"
          >
            <LucideIcon name="Check" size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: DETALHAMENTO DE MOVIMENTAÇÕES */}
      <AnimatePresence>
        {selectedMovementType && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    selectedMovementType === 'receita' ? 'bg-emerald-50 text-emerald-600' :
                    selectedMovementType === 'despesa' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <LucideIcon 
                      name={
                        selectedMovementType === 'receita' ? 'TrendingUp' :
                        selectedMovementType === 'despesa' ? 'TrendingDown' : 'DollarSign'
                      } 
                      size={20} 
                      className="stroke-[2.5]"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      {selectedMovementType === 'receita' && 'Movimentações de Receitas'}
                      {selectedMovementType === 'despesa' && 'Movimentações de Despesas'}
                      {selectedMovementType === 'saldo' && 'Todas as Movimentações'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Histórico detalhado do período atual</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMovementType(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <LucideIcon name="X" size={18} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Summary and Search */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Acumulado</span>
                  <span className={`text-xl font-black font-mono ${
                    selectedMovementType === 'receita' ? 'text-emerald-600' :
                    selectedMovementType === 'despesa' ? 'text-rose-600' :
                    movementsSum >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(movementsSum)}
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <LucideIcon name="Search" size={14} />
                  </span>
                  <input
                    type="text"
                    value={movementsSearchTerm}
                    onChange={(e) => setMovementsSearchTerm(e.target.value)}
                    placeholder="Buscar por descrição..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {movementsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <LucideIcon name="Inbox" size={36} className="text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">Nenhuma movimentação encontrada.</p>
                  </div>
                ) : (
                  movementsList.map((t) => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const formattedDate = t.date.split('-').reverse().join('/');
                    
                    return (
                      <div 
                        key={t.id} 
                        className="p-3 bg-white hover:bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col gap-2 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: cat?.color || '#94a3b8' }}
                            >
                              <LucideIcon name={cat?.icon || 'HelpCircle'} size={15} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 leading-tight">{t.title}</h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{cat?.name || 'Sem Categoria'}</span>
                                <span className="text-slate-300 text-[10px]">•</span>
                                <span className="text-[10px] font-bold text-slate-500 font-mono">{formattedDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-xs font-black font-mono block ${
                              t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                            </span>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                t.flowType === 'pessoal' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                              }`}>
                                {t.flowType === 'pessoal' ? 'Pessoal' : 'Comércio'}
                              </span>
                              {t.paymentMethod && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                  {t.paymentMethod}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {t.notes && (
                          <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                            <strong>Obs:</strong> {t.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedMovementType(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ZERAR PAINEL E INICIAR NOVO MÊS */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="bg-rose-50 p-2.5 rounded-2xl">
                    <LucideIcon name="AlertTriangle" size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Zerar Painel Comercial</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Começar um novo ciclo de lançamentos</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-rose-50/50 border border-rose-100 text-rose-950 p-3.5 rounded-2xl text-[11px] leading-relaxed font-medium">
                  ⚠️ <strong>Atenção:</strong> Esta ação irá <strong>excluir permanentemente</strong> todos os lançamentos de receitas e despesas cadastrados atualmente para redefinir os totais e gráficos do painel de controle.
                  <p className="mt-1.5 text-rose-800 font-semibold">Certifique-se de exportar ou gerar os relatórios mensais antes de prosseguir!</p>
                </div>

                <div className="space-y-4">
                  {/* Saldo Inicial Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Saldo Inicial (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={resetInitialBalance}
                        onChange={(e) => setResetInitialBalance(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-9 pr-4 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">Opcional. Se preenchido, criará automaticamente um lançamento de saldo inicial como receita no novo mês.</p>
                  </div>

                  {/* Flow Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Aplicar Saldo Inicial em:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['pessoal', 'comercio', 'ambos'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setResetFlowType(type)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer capitalize ${
                            resetFlowType === type
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {type === 'comercio' ? 'Comércio' : type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200/50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetDashboard}
                  disabled={isResetting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Zerando...
                    </>
                  ) : (
                    <>
                      <LucideIcon name="RefreshCw" size={12} />
                      Zerar e Iniciar Novo Mês
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

