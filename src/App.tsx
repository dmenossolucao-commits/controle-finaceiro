import React, { useState, useEffect } from 'react';
import { Category, Transaction, FlowType, Note, BillReminder } from './types';
import { 
  getCategories, 
  getTransactions, 
  addTransaction, 
  deleteTransaction, 
  addCategory,
  deleteCategory,
  getNotes,
  updateNote,
  getBillReminders,
  updateBillReminder
} from './lib/dbService';
import { LucideIcon } from './components/Icon';
import { FinancialCharts } from './components/FinancialCharts';
import { TransactionForm } from './components/TransactionForm';
import { TransactionsList } from './components/TransactionsList';
import { CategoryModal } from './components/CategoryModal';
import { ReportGenerator } from './components/ReportGenerator';
import { ManagerWorkspace } from './components/ManagerWorkspace';
import { ShelfLabelPrinter } from './components/ShelfLabelPrinter';
import { AIAgentWorkspace } from './components/AIAgentWorkspace';
import { ConfirmModal } from './components/ConfirmModal';
import { Caixinhas } from './components/Caixinhas';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [activeFlow, setActiveFlow] = useState<FlowType | 'combinado'>('pessoal');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos' | 'categorias' | 'relatorios' | 'workspace' | 'pedidos' | 'lembretes' | 'etiquetas' | 'fechamento' | 'ia-agent' | 'caixinhas'>('dashboard');

  const handleRefreshTransactions = async () => {
    try {
      const txs = await getTransactions();
      const nts = await getNotes();
      const rems = await getBillReminders();
      const cats = await getCategories();
      setTransactions(txs);
      setNotes(nts);
      setBillReminders(rems);
      setCategories(cats);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [lastAddedCategoryId, setLastAddedCategoryId] = useState<string | null>(null);

  // Confirmation Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Load initial data from Firestore
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const cats = await getCategories();
        const txs = await getTransactions();
        const nts = await getNotes();
        const rems = await getBillReminders();
        setCategories(cats);
        setTransactions(txs);
        setNotes(nts);
        setBillReminders(rems);
      } catch (err) {
        console.error('Erro ao carregar dados do banco:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync data whenever switching back to dashboard to ensure notifications are up to date
  useEffect(() => {
    if (activeTab === 'dashboard') {
      async function refreshDashboard() {
        try {
          const txs = await getTransactions();
          const nts = await getNotes();
          const rems = await getBillReminders();
          setTransactions(txs);
          setNotes(nts);
          setBillReminders(rems);
        } catch (e) {
          console.error('Erro ao sincronizar dados do dashboard:', e);
        }
      }
      refreshDashboard();
    }
  }, [activeTab]);

  // Display auto-dismissing toast messages
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  // Add a new transaction
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const savedTx = await addTransaction(newTx);
      setTransactions(prev => [savedTx, ...prev]);
      
      // Auto-switch flow to match the added transaction if we are not in combined view
      if (activeFlow !== 'combinado' && activeFlow !== savedTx.flowType) {
        setActiveFlow(savedTx.flowType);
      }
      
      showToast('Transação registrada com sucesso!');
    } catch (err) {
      console.error('Erro ao adicionar transação:', err);
      throw err;
    }
  };

  // Delete a transaction
  const handleDeleteTransaction = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Lançamento',
      message: 'Tem certeza de que deseja excluir este lançamento? Esta ação não poderá ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTransaction(id);
          setTransactions(prev => prev.filter(t => t.id !== id));
          showToast('Lançamento excluído com sucesso.');
        } catch (err) {
          console.error('Erro ao excluir transação:', err);
        }
      }
    });
  };

  // Add custom category
  const handleAddCategory = async (newCat: Omit<Category, 'id' | 'isSystem'>) => {
    try {
      const savedCat = await addCategory({ ...newCat, isSystem: false });
      setCategories(prev => [...prev, savedCat]);
      setLastAddedCategoryId(savedCat.id);
      showToast('Categoria personalizada criada!');
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      showToast('Erro ao criar categoria.');
      throw err; // Re-throw to propagate error to the modal
    }
  };

  // Delete custom category
  const handleDeleteCategory = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Categoria',
      message: 'Tem certeza de que deseja excluir esta categoria? Os lançamentos associados a ela não serão excluídos.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCategory(id);
          setCategories(prev => prev.filter(c => c.id !== id));
          showToast('Categoria excluída.');
        } catch (err) {
          console.error('Erro ao excluir categoria:', err);
        }
      }
    });
  };

  // Toggle note/reminder completed status
  const handleToggleNoteCompleted = async (noteId: string, currentStatus: boolean) => {
    try {
      await updateNote(noteId, { isCompleted: !currentStatus });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isCompleted: !currentStatus } : n));
      showToast(!currentStatus ? 'Conta marcada como paga!' : 'Conta reaberta.');
    } catch (err) {
      console.error('Erro ao atualizar lembrete:', err);
      showToast('Erro ao atualizar status.');
    }
  };

  // Pay bill reminder from Dashboard
  const handlePayBillReminderFromDashboard = async (reminder: BillReminder) => {
    try {
      const isReceivable = reminder.type === 'receber';
      if (reminder.frequency === 'unico') {
        await updateBillReminder(reminder.id, { status: 'pago' });
        setBillReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, status: 'pago' } : r));
        showToast(isReceivable ? 'Lançamento marcado como recebido!' : 'Conta marcada como paga!');
      } else {
        const getNextDueDate = (currentDueDate: string, freq: BillReminder['frequency']): string => {
          const date = new Date(currentDueDate + 'T12:00:00');
          if (freq === 'semanal') date.setDate(date.getDate() + 7);
          else if (freq === 'quinzenal') date.setDate(date.getDate() + 15);
          else if (freq === 'mensal') date.setMonth(date.getMonth() + 1);
          else if (freq === 'anual') date.setFullYear(date.getFullYear() + 1);
          return date.toISOString().split('T')[0];
        };

        const nextDate = getNextDueDate(reminder.dueDate, reminder.frequency);
        await updateBillReminder(reminder.id, {
          dueDate: nextDate,
          status: 'pendente'
        });
        setBillReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, dueDate: nextDate, status: 'pendente' } : r));
        showToast(isReceivable ? `Confirmado recebimento! Próximo vencimento atualizado para ${nextDate}.` : `Conta paga! Próximo vencimento atualizado para ${nextDate}.`);
      }
    } catch (err) {
      console.error('Erro ao processar pagamento/recebimento:', err);
      showToast(reminder.type === 'receber' ? 'Erro ao registrar recebimento.' : 'Erro ao pagar boleto.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16 flex flex-col justify-between">
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900 text-white shadow-md relative md:sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          
          {/* Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-1.5 md:p-2.5 rounded-xl text-white shadow-md">
              <LucideIcon name="Layers" size={18} />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-extrabold tracking-tight font-sans">Controle Financeiro</h1>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-mono">Pessoal & Comercial Integrados com IA</p>
            </div>
          </div>

          {/* MAIN MENU TABS */}
          <nav className="flex flex-row overflow-x-auto whitespace-nowrap scrollbar-none md:flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-xl w-full md:w-auto max-w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'dashboard' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="PieChart" size={13} />
              Painel
            </button>
            <button
              onClick={() => setActiveTab('lancamentos')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'lancamentos' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="Plus" size={13} />
              Lançamentos
            </button>
            <button
              onClick={() => setActiveTab('lembretes')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'lembretes' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="CalendarDays" size={13} />
              Contas a Pagar & Receber
            </button>
            <button
              onClick={() => setActiveTab('categorias')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'categorias' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="Layers" size={13} />
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'relatorios' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="FileText" size={13} />
              Relatórios PDF
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'workspace' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="Briefcase" size={13} />
              Caixa & Bancos
            </button>
            <button
              onClick={() => setActiveTab('fechamento')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'fechamento' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="Lock" size={13} />
              Fechamento de Caixa
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'pedidos' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="ShoppingCart" size={13} />
              Lista de Pedidos
            </button>
            <button
              onClick={() => setActiveTab('etiquetas')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'etiquetas' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="Tag" size={13} />
              Etiquetas Gôndola
            </button>
            <button
              onClick={() => setActiveTab('caixinhas')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'caixinhas' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LucideIcon name="PiggyBank" size={13} />
              Caixinhas
            </button>
          </nav>

        </div>
      </header>

      {/* SUB-HEADER: FLOW DIVISION SELECTOR */}
      {(activeTab === 'dashboard' || activeTab === 'lancamentos') && (
        <div className="bg-white border-b border-slate-100 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Instructions */}
            <div className="text-center sm:text-left">
              <h2 className="text-sm font-bold text-slate-800">Selecione o Fluxo de Acompanhamento</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Separação de contas eficiente e automática</p>
            </div>

            {/* Flow Selector Badges */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0">
              <button
                onClick={() => setActiveFlow('pessoal')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFlow === 'pessoal' 
                    ? 'bg-blue-500 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <LucideIcon name="User" size={13} />
                Pessoal
              </button>
              <button
                onClick={() => setActiveFlow('comercio')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFlow === 'comercio' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <LucideIcon name="Briefcase" size={13} />
                Meu Comércio
              </button>
              <button
                onClick={() => setActiveFlow('combinado')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFlow === 'combinado' 
                    ? 'bg-gradient-to-r from-blue-600 to-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <LucideIcon name="RefreshCw" size={13} />
                Combinado
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 bg-slate-900 text-white border border-slate-800 rounded-xl px-4 py-3 shadow-2xl flex items-center space-x-2 text-xs font-semibold"
          >
            <LucideIcon name="Check" size={16} className="text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Sincronizando com Firestore do Firebase...</p>
          </div>
        ) : (
          <div
            key={activeTab}
            className="animate-tab-fade"
          >
              {/* VIEW: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Financial KPI Dashboard Cards & SVG Charts */}
                  <FinancialCharts
                    transactions={transactions}
                    categories={categories}
                    activeFlow={activeFlow}
                    onNavigateTab={setActiveTab}
                    onRefreshTransactions={handleRefreshTransactions}
                  />

                  {/* NOTIFICATION SYSTEM: ACCOUNTS DUE OR OVERDUE */}
                  {(() => {
                    const getDaysDiff = (dateStr?: string) => {
                      if (!dateStr) return 0;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      // Midday to prevent timezone drift
                      const due = new Date(dateStr + 'T12:00:00');
                      due.setHours(0, 0, 0, 0);
                      
                      const diffTime = due.getTime() - today.getTime();
                      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    };

                    // 1. Map pending manual notes / reminders
                    const pendingNotes = notes
                      .filter(n => n.type === 'lembrete' && !n.isCompleted && n.dueDate)
                      .map(n => ({
                        id: n.id,
                        title: n.title,
                        isBill: false,
                        dueDate: n.dueDate!,
                        notes: n.content || 'Sem observações adicionais',
                        color: n.color || '#e2e8f0',
                        reminderDaysBefore: 3,
                        original: n
                      }));

                    // 2. Map pending system bill reminders
                    const pendingBills = billReminders
                      .filter(r => r.status === 'pendente' && r.dueDate)
                      .map(r => ({
                        id: r.id,
                        title: r.title,
                        isBill: true,
                        billType: r.type || 'pagar',
                        dueDate: r.dueDate,
                        amount: r.amount,
                        notes: r.notes || 'Lembrete do sistema',
                        color: r.flowType === 'pessoal' ? '#6366f1' : '#14b8a6',
                        reminderDaysBefore: r.reminderDaysBefore,
                        original: r
                      }));

                    // 3. Combine and filter based on individual reminder settings
                    const allNotifications = [...pendingNotes, ...pendingBills];
                    const criticalBills = allNotifications
                      .filter(item => {
                        const diff = getDaysDiff(item.dueDate);
                        return diff <= item.reminderDaysBefore;
                      })
                      .sort((a, b) => getDaysDiff(a.dueDate) - getDaysDiff(b.dueDate));

                    if (criticalBills.length === 0) {
                      return (
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-3xs">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-500 text-white p-2 rounded-xl">
                              <LucideIcon name="CheckCircle2" size={18} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-900">Suas Contas estão em Dia!</h4>
                              <p className="text-[11px] text-emerald-600">Nenhum boleto ou compromisso pendente vencendo em breve.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('workspace');
                            }}
                            className="text-[10px] font-black text-emerald-800 hover:underline cursor-pointer"
                          >
                            Ir para Workspace →
                          </button>
                        </div>
                      );
                    }

                    const hasOverdue = criticalBills.some(b => getDaysDiff(b.dueDate) < 0);

                    return (
                      <div className={`border rounded-2xl p-5 shadow-2xs ${hasOverdue ? 'bg-rose-50/50 border-rose-100' : 'bg-amber-50/50 border-amber-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl text-white ${hasOverdue ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`}>
                              <LucideIcon name="Bell" size={18} />
                            </div>
                            <div>
                              <h4 className={`text-xs font-black uppercase tracking-wider ${hasOverdue ? 'text-rose-900' : 'text-slate-900'}`}>
                                {hasOverdue ? '🚨 Alerta: Contas e Recebimentos pendentes!' : '⚠️ Atenção: Compromissos Vencendo em breve!'}
                              </h4>
                              <p className={`text-[11px] font-medium ${hasOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                Você possui <strong>{criticalBills.length}</strong> compromisso(s) pendente(s) que precisam de atenção.
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setActiveTab('workspace');
                            }}
                            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all shrink-0 shadow-3xs"
                          >
                            Gerenciar Contas & Workspace
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {criticalBills.map(bill => {
                            const diff = getDaysDiff(bill.dueDate);
                            const isLate = diff < 0;
                            const isToday = diff === 0;
                            
                            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200/50";
                            let badgeText = `Vence em ${diff} dias`;
                            
                            if (isLate) {
                              badgeStyle = "bg-rose-600 text-white border-rose-700";
                              badgeText = `Atrasado há ${Math.abs(diff)} dia(s)`;
                            } else if (isToday) {
                              badgeStyle = "bg-amber-500 text-white border-amber-600 animate-pulse";
                              badgeText = "Vence Hoje!";
                            } else if (diff === 1) {
                              badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";
                              badgeText = "Vence Amanhã";
                            }

                            const isReceivable = bill.isBill && 'billType' in bill && bill.billType === 'receber';

                            return (
                              <div
                                key={bill.id}
                                className="bg-white border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden"
                              >
                                {/* Decorative indicator on the side of the card */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${isReceivable ? 'bg-teal-500' : bill.isBill ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                <div className="pl-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bill.color }} />
                                      <h5 className="text-xs font-black text-slate-800 line-clamp-1">{bill.title}</h5>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                                      {badgeText}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {bill.isBill && (
                                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${isReceivable ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                        {isReceivable ? '📥 A Receber' : '💸 A Pagar'}
                                      </span>
                                    )}
                                    {bill.original && (bill.original as BillReminder).flowType && (
                                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                                        (bill.original as BillReminder).flowType === 'pessoal' 
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                          : 'bg-purple-50 text-purple-700 border-purple-100'
                                      }`}>
                                        {(bill.original as BillReminder).flowType === 'pessoal' ? '👤 Pessoal' : '💼 Comercial'}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {bill.isBill && bill.amount !== undefined && (
                                    <p className={`text-sm font-extrabold font-mono mt-1 ${isReceivable ? 'text-teal-700' : 'text-rose-700'}`}>
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                                    </p>
                                  )}

                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg italic">
                                    {bill.notes}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-50 pl-1">
                                  <span className="text-[10px] font-bold text-slate-400">
                                    📅 Vencimento: <strong className="text-slate-600 font-mono">{bill.dueDate}</strong>
                                  </span>
                                  
                                  {bill.isBill ? (
                                    <button
                                      onClick={() => handlePayBillReminderFromDashboard(bill.original as BillReminder)}
                                      className={`px-2.5 py-1 text-white rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-3xs ${
                                        isReceivable 
                                          ? 'bg-teal-600 hover:bg-teal-700' 
                                          : 'bg-emerald-600 hover:bg-emerald-700'
                                      }`}
                                      title={isReceivable ? 'Confirmar recebimento' : 'Confirmar pagamento'}
                                    >
                                      <LucideIcon name="Check" size={11} className="stroke-[3]" />
                                      {isReceivable ? 'Confirmar Recebido' : 'Confirmar Pago'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleNoteCompleted(bill.id, false)}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                                      title="Marcar como concluído"
                                    >
                                      <LucideIcon name="Check" size={11} />
                                      Concluir
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick transactions list below dashboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      {/* Short helper panel explaining automatic sorting */}
                      <div className="bg-linear-to-tr from-slate-900 to-slate-800 rounded-2xl border border-slate-800 p-6 text-white space-y-4 shadow-lg">
                        <h4 className="text-sm font-bold flex items-center gap-1.5">
                          <LucideIcon name="Sparkles" size={16} className="text-blue-400" />
                          Separação de Fluxos por IA
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-300">
                          Nosso sistema conta com o modelo <strong>Gemini 2.5 Flash</strong> que analisa notas fiscais e comprovantes em PDF. Ele detecta CNPJs, itens de fornecedores ou compras corporativas, separando de forma 100% automatizada e inteligente as contas de seu <strong>Comércio</strong> das suas contas <strong>Pessoais</strong>.
                        </p>
                        <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Segurança ponta-a-ponta</span>
                          <span>Contas organizadas</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <TransactionsList
                        transactions={transactions}
                        categories={categories}
                        onDelete={handleDeleteTransaction}
                        activeFlow={activeFlow}
                        maxItems={5}
                      />
                      {transactions.length > 5 && (
                        <button
                          onClick={() => setActiveTab('lancamentos')}
                          className="mt-3 w-full py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          Visualizar Histórico Completo ({transactions.length} lançamentos)
                          <LucideIcon name="TrendingUp" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: LANÇAMENTOS (INPUT & LIST) */}
              {activeTab === 'lancamentos' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Add form */}
                  <div className="lg:col-span-1">
                    <TransactionForm
                      categories={categories}
                      onSubmit={handleAddTransaction}
                      onAddCategoryClick={() => setIsCategoryModalOpen(true)}
                      defaultFlowType={activeFlow === 'combinado' ? 'pessoal' : activeFlow}
                      lastAddedCategoryId={lastAddedCategoryId}
                    />
                  </div>
                  
                  {/* Right panel: Table list with all search parameters */}
                  <div className="lg:col-span-2">
                    <TransactionsList
                      transactions={transactions}
                      categories={categories}
                      onDelete={handleDeleteTransaction}
                      activeFlow={activeFlow}
                    />
                  </div>
                </div>
              )}

              {/* VIEW: CATEGORIAS */}
              {activeTab === 'categorias' && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Gerenciador de Categorias</h3>
                      <p className="text-xs text-slate-500 mt-1">Organize seus lançamentos com categorias adaptadas ao seu perfil.</p>
                    </div>
                    <button
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-center"
                    >
                      <LucideIcon name="Plus" size={14} />
                      Nova Categoria
                    </button>
                  </div>

                  {/* CATEGORIES GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between hover:border-slate-200 transition-all">
                        <div className="flex items-start justify-between">
                          <div 
                            className="p-2.5 rounded-xl text-white shadow-xs"
                            style={{ backgroundColor: cat.color }}
                          >
                            <LucideIcon name={cat.icon} size={18} />
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              cat.flowType === 'pessoal' 
                                ? 'bg-blue-50 text-blue-600' 
                                : cat.flowType === 'comercio' 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {cat.flowType === 'pessoal' ? 'Pessoal' : cat.flowType === 'comercio' ? 'Comércio' : 'Ambos'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{cat.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {cat.isSystem ? 'Sistema (Padrão)' : 'Customizada'}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <LucideIcon name="Trash2" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW: RELATÓRIOS PDF */}
              {activeTab === 'relatorios' && (
                <ReportGenerator
                  transactions={transactions}
                  categories={categories}
                />
              )}

              {/* VIEW: WORKSPACE DE GESTÃO (CAIXA, BANCOS, ANOTAÇÕES) */}
              {activeTab === 'workspace' && (
                <ManagerWorkspace
                  transactions={transactions}
                  categories={categories}
                  onRefreshTransactions={handleRefreshTransactions}
                  showToast={showToast}
                />
              )}

              {/* VIEW: FECHAMENTO DE CAIXA (DEDICADA) */}
              {activeTab === 'fechamento' && (
                <ManagerWorkspace
                  transactions={transactions}
                  categories={categories}
                  onRefreshTransactions={handleRefreshTransactions}
                  showToast={showToast}
                  initialSubTab="fechamento"
                  hideOtherSubTabs={true}
                />
              )}

              {/* VIEW: CONTAS A PAGAR E RECEBER (DEDICADA) */}
              {activeTab === 'lembretes' && (
                <ManagerWorkspace
                  transactions={transactions}
                  categories={categories}
                  onRefreshTransactions={handleRefreshTransactions}
                  showToast={showToast}
                  initialSubTab="lembretes"
                  hideOtherSubTabs={true}
                />
              )}

              {/* VIEW: LISTA DE PEDIDOS / COMPRAS (DEDICADA) */}
              {activeTab === 'pedidos' && (
                <ManagerWorkspace
                  transactions={transactions}
                  categories={categories}
                  onRefreshTransactions={handleRefreshTransactions}
                  showToast={showToast}
                  initialSubTab="pedidos"
                  hideOtherSubTabs={true}
                />
              )}

              {/* VIEW: IMPRESSORA DE ETIQUETAS DE GÔNDOLA */}
              {activeTab === 'etiquetas' && (
                <ShelfLabelPrinter />
              )}

              {/* VIEW: CAIXINHAS DE INVESTIMENTO E RENDIMENTO */}
              {activeTab === 'caixinhas' && (
                <Caixinhas showToast={showToast} />
              )}
            </div>
        )}
      </main>

      {/* CATEGORY MODAL DIALOG */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onAddCategory={handleAddCategory}
        defaultFlowType={activeFlow}
        categories={categories}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* GLOBAL DRAGGABLE FLOATING AI ASSISTANT WIDGET */}
      <AIAgentWorkspace
        categories={categories}
        transactions={transactions}
        onRefreshData={handleRefreshTransactions}
        showToast={showToast}
      />

      {/* REUSABLE CONFIRMATION DIALOG MODAL */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
}
