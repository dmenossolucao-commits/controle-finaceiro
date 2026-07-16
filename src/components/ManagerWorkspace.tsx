import React, { useState, useEffect } from 'react';
import { Transaction, Category, Bank, Note, CashClosure, PaymentMethod, OrderItem, BillReminder } from '../types';
import { LucideIcon } from './Icon';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getBanks, addBank, updateBank, deleteBank,
  getNotes, addNote, updateNote, deleteNote,
  getClosures, addClosure, updateTransactionStatus, deleteClosure,
  getOrderItems, addOrderItem, updateOrderItem, deleteOrderItem, clearAllOrderItems,
  addTransaction, addCategory, deleteCategory,
  getBillReminders, addBillReminder, updateBillReminder, deleteBillReminder, resetAllData,
  exportAllData, importAllData
} from '../lib/dbService';
import { safeStorage } from '../lib/safeStorage';

interface ManagerWorkspaceProps {
  transactions: Transaction[];
  categories: Category[];
  onRefreshTransactions: () => Promise<void>;
  showToast: (msg: string) => void;
  initialSubTab?: SubTab;
  hideOtherSubTabs?: boolean;
}

type SubTab = 'bancos' | 'fechamento' | 'notas' | 'pedidos' | 'lembretes';

const getCategoryIcon = (name: string): string => {
  const normalized = name.toLowerCase();
  if (normalized.includes('mercado') || normalized.includes('compras') || normalized.includes('loja')) return 'ShoppingCart';
  if (normalized.includes('distribuidor') || normalized.includes('fornecedor') || normalized.includes('entrega') || normalized.includes('carga')) return 'Truck';
  if (normalized.includes('açougue') || normalized.includes('carne')) return 'Beef';
  if (normalized.includes('feira') || normalized.includes('hortifruti') || normalized.includes('fruta') || normalized.includes('verdura') || normalized.includes('organico')) return 'Leaf';
  if (normalized.includes('limpeza') || normalized.includes('higiene') || normalized.includes('brilho')) return 'Sparkles';
  if (normalized.includes('geral') || normalized.includes('outros')) return 'ClipboardList';
  return 'Folder';
};

export const ManagerWorkspace: React.FC<ManagerWorkspaceProps> = ({
  transactions,
  categories,
  onRefreshTransactions,
  showToast,
  initialSubTab,
  hideOtherSubTabs
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab || 'bancos');

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

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Data states
  const [banks, setBanks] = useState<Bank[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Bill Reminders states
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState<BillReminder['frequency']>('mensal');
  const [reminderFlowType, setReminderFlowType] = useState<BillReminder['flowType']>('pessoal');
  const [reminderType, setReminderType] = useState<'pagar' | 'receber'>('pagar');
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(3);
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderCategoryId, setReminderCategoryId] = useState('');
  const [reminderFilter, setReminderFilter] = useState<'todos' | 'pendente' | 'pago' | 'atrasado'>('todos');
  const [reminderFlowFilter, setReminderFlowFilter] = useState<'todos' | 'pessoal' | 'comercio'>('todos');
  const [reminderTypeFilter, setReminderTypeFilter] = useState<'todos' | 'pagar' | 'receber'>('todos');
  const [payingReminderId, setPayingReminderId] = useState<string | null>(null);
  const [recordAsExpense, setRecordAsExpense] = useState(true);
  const [selectedDebitBankId, setSelectedDebitBankId] = useState('');

  // Shopping List / Order Form state
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [orderCategory, setOrderCategory] = useState('Geral');
  const [orderSuggestions, setOrderSuggestions] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('order_suggestions');
      return saved ? JSON.parse(saved) : ['Geral', 'Supermercado', 'Distribuidor', 'Açougue', 'Feira / Hortifruti', 'Higiene & Limpeza'];
    } catch (e) {
      return ['Geral', 'Supermercado', 'Distribuidor', 'Açougue', 'Feira / Hortifruti', 'Higiene & Limpeza'];
    }
  });
  const [orderQty, setOrderQty] = useState('1');
  const [orderPriority, setOrderPriority] = useState<OrderItem['priority']>('media');
  const [orderPriceEstimate, setOrderPriceEstimate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderFilter, setOrderFilter] = useState<'todos' | 'pendente' | 'comprado'>('todos');

  useEffect(() => {
    try {
      safeStorage.setItem('order_suggestions', JSON.stringify(orderSuggestions));
    } catch (e) {}
  }, [orderSuggestions]);

  // Bank Form state
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankType, setBankType] = useState<Bank['type']>('digital');
  const [bankBalance, setBankBalance] = useState('');
  const [bankColor, setBankColor] = useState('#8b5cf6');

  // Edit Bank Balance state
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBalance, setEditingBalance] = useState('');
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

  // Note Form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<Note['type']>('nota');
  const [noteDueDate, setNoteDueDate] = useState('');
  const [noteColor, setNoteColor] = useState('#fef08a'); // Amber-100 default

  // Filter notes state
  const [noteFilter, setNoteFilter] = useState<'todos' | 'notas' | 'lembretes_pendentes' | 'lembretes_concluidos'>('todos');

  // Cash Closure Wizard state
  const [cardDiscountRate, setCardDiscountRate] = useState<number>(2.0); // Default 2% fee
  const [pixBankId, setPixBankId] = useState('');
  const [creditCardBankId, setCreditCardBankId] = useState('');
  const [debitCardBankId, setDebitCardBankId] = useState('');
  const [cashBankId, setCashBankId] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [isClosingCaixa, setIsClosingCaixa] = useState(false);

  // Direct Manual Closure state
  const [closureMode, setClosureMode] = useState<'manual' | 'sistema'>('manual');
  const [manualDate, setManualDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [manualDinheiro, setManualDinheiro] = useState<string>('');
  const [manualPix, setManualPix] = useState<string>('');
  const [manualCredito, setManualCredito] = useState<string>('');
  const [manualDebito, setManualDebito] = useState<string>('');
  const [manualOutros, setManualOutros] = useState<string>('');
  const [manualValesDinheiro, setManualValesDinheiro] = useState<string>('');
  const [manualValesPix, setManualValesPix] = useState<string>('');
  const [manualValesCredito, setManualValesCredito] = useState<string>('');
  const [manualValesDebito, setManualValesDebito] = useState<string>('');
  const [manualValesOutros, setManualValesOutros] = useState<string>('');

  // Dynamic Custom Manual Outflows state list
  const [manualOutflows, setManualOutflows] = useState<Array<{
    id: string;
    title: string;
    categoryId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
  }>>([]);
  const [manualOutflowTitle, setManualOutflowTitle] = useState('');
  const [manualOutflowCategoryId, setManualOutflowCategoryId] = useState('');
  const [manualOutflowAmount, setManualOutflowAmount] = useState('');
  const [manualOutflowPaymentMethod, setManualOutflowPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [manualOutflowDate, setManualOutflowDate] = useState(new Date().toISOString().split('T')[0]);
  const [newManualOutflowCategoryName, setNewManualOutflowCategoryName] = useState('');
  const [isCreatingManualOutflowCategory, setIsCreatingManualOutflowCategory] = useState(false);

  // Vale/Outflow Form state
  const [valeAmount, setValeAmount] = useState('');
  const [valeTitle, setValeTitle] = useState('');
  const [valeCategoryId, setValeCategoryId] = useState('');
  const [valePaymentMethod, setValePaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [valeDate, setValeDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingVale, setIsAddingVale] = useState(false);
  const [newValeCategoryName, setNewValeCategoryName] = useState('');
  const [isCreatingValeCategory, setIsCreatingValeCategory] = useState(false);

  const [isResetting, setIsResetting] = useState(false);

  const handleResetSystemData = () => {
    setConfirmState({
      isOpen: true,
      title: 'Zerar Todo o Sistema',
      message: '🚨 ATENÇÃO: Você está prestes a apagar absolutamente TODOS os lançamentos, fechamentos, anotações, lembretes, itens de compras e zerar todos os saldos de contas! Esta ação é irreversível e apagará todo o seu histórico. Deseja realmente resetar o sistema?',
      variant: 'danger',
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await resetAllData();
          await onRefreshTransactions();
          await loadData();
          showToast('Sistema reiniciado com sucesso! Todos os valores começaram do zero.');
        } catch (err) {
          console.error(err);
          showToast('Erro ao zerar o sistema.');
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  // Handle Delete Cash Closure
  const handleDeleteClosureClick = (id: string, date: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Fechamento',
      message: `Deseja realmente excluir permanentemente o fechamento do dia ${date}? Esta ação é irreversível!`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteClosure(id);
          setClosures(prev => prev.filter(c => c.id !== id));
          showToast('Fechamento de caixa excluído com sucesso.');
        } catch (err) {
          console.error('Erro ao deletar fechamento:', err);
          showToast('Erro ao excluir o fechamento de caixa.');
        }
      }
    });
  };

  // Load resources
  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedBanks = await getBanks() || [];
      const fetchedNotes = await getNotes() || [];
      const fetchedClosures = await getClosures() || [];
      const fetchedOrders = await getOrderItems() || [];
      const fetchedReminders = await getBillReminders() || [];
      
      setBanks(fetchedBanks);
      setNotes(fetchedNotes);
      setClosures(fetchedClosures);
      setOrders(fetchedOrders);
      setBillReminders(fetchedReminders);

      // Auto-select first bank for deposits if available with bulletproof checks
      if (fetchedBanks && fetchedBanks.length > 0) {
        const validBanks = fetchedBanks.filter(b => b && typeof b === 'object' && b.id);
        if (validBanks.length > 0) {
          const cashBank = validBanks.find(b => 
            b.type === 'carteira' || 
            b.id === 'default_cash' || 
            (b.name && String(b.name).toLowerCase().includes('cofre'))
          ) || validBanks[0];

          const digitalBank = validBanks.find(b => 
            b.type === 'digital' || 
            b.id === 'default_nubank'
          ) || validBanks[0];
          
          if (cashBank && cashBank.id) {
            setCashBankId(cashBank.id);
          }
          if (digitalBank && digitalBank.id) {
            setPixBankId(digitalBank.id);
            setCreditCardBankId(digitalBank.id);
            setDebitCardBankId(digitalBank.id);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do workspace:', err);
      // Suppress annoying sync toasts to prevent disrupting user experience on transient database/polling states
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [transactions]);

  // Handle Add Bank
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankBalance) return;

    const balanceNum = parseFloat(bankBalance.replace(',', '.'));
    if (isNaN(balanceNum)) {
      showToast('Valor de saldo inválido.');
      return;
    }

    try {
      const newBank = await addBank({
        name: bankName,
        type: bankType,
        balance: balanceNum,
        color: bankColor
      });
      setBanks(prev => [...prev, newBank]);
      setIsAddingBank(false);
      setBankName('');
      setBankBalance('');
      showToast(`Banco "${bankName}" criado com sucesso!`);
    } catch (err) {
      showToast('Erro ao criar banco.');
    }
  };

  // Handle Edit Bank Balance
  const handleUpdateBalance = async (bankId: string) => {
    const val = parseFloat(editingBalance.replace(',', '.'));
    if (isNaN(val)) {
      showToast('Saldo inválido.');
      return;
    }
    try {
      await updateBank(bankId, { balance: val });
      setBanks(prev => prev.map(b => b.id === bankId ? { ...b, balance: val } : b));
      setEditingBankId(null);
      setEditingBalance('');
      showToast('Saldo atualizado com sucesso.');
    } catch (e) {
      showToast('Erro ao atualizar saldo.');
    }
  };

  // Handle Delete Bank
  const handleDeleteBankClick = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Banco',
      message: `Tem certeza de que deseja excluir o banco "${name}"? Os saldos não serão transferidos.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBank(id);
          setBanks(prev => prev.filter(b => b.id !== id));
          showToast('Banco excluído.');
        } catch (err) {
          showToast('Erro ao excluir banco.');
        }
      }
    });
  };

  // Handle Add Note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    try {
      const newNote = await addNote({
        title: noteTitle,
        content: noteContent,
        type: noteType,
        dueDate: noteType === 'lembrete' && noteDueDate ? noteDueDate : undefined,
        isCompleted: noteType === 'lembrete' ? false : undefined,
        color: noteColor
      });
      setNotes(prev => [newNote, ...prev]);
      setIsAddingNote(false);
      setNoteTitle('');
      setNoteContent('');
      setNoteDueDate('');
      showToast(noteType === 'nota' ? 'Anotação salva!' : 'Lembrete criado!');
    } catch (e) {
      showToast('Erro ao salvar nota.');
    }
  };

  // Toggle Reminder Status
  const handleToggleReminder = async (note: Note) => {
    const nextStatus = !note.isCompleted;
    try {
      await updateNote(note.id, { isCompleted: nextStatus });
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: nextStatus } : n));
      showToast(nextStatus ? 'Lembrete marcado como concluído!' : 'Lembrete reaberto.');
    } catch (e) {
      showToast('Erro ao atualizar lembrete.');
    }
  };

  // Handle Delete Note
  const handleDeleteNoteClick = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Anotação',
      message: 'Excluir esta anotação permanentemente?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNote(id);
          setNotes(prev => prev.filter(n => n.id !== id));
          showToast('Anotação removida.');
        } catch (e) {
          showToast('Erro ao excluir.');
        }
      }
    });
  };

  // --- BILL REMINDERS LOGIC ---
  const handleCreateBillReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderAmount || !reminderDueDate) return;

    const amountNum = parseFloat(reminderAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Por favor, insira um valor de cobrança/recebimento válido.');
      return;
    }

    try {
      const newReminder = await addBillReminder({
        title: reminderTitle.trim(),
        amount: amountNum,
        dueDate: reminderDueDate,
        frequency: reminderFrequency,
        status: 'pendente',
        flowType: reminderFlowType,
        type: reminderType,
        reminderDaysBefore: Number(reminderDaysBefore),
        notes: reminderNotes.trim() || undefined,
        categoryId: reminderCategoryId || undefined
      });

      setBillReminders(prev => [newReminder, ...prev]);
      setIsAddingReminder(false);
      setReminderTitle('');
      setReminderAmount('');
      setReminderDueDate('');
      setReminderNotes('');
      setReminderCategoryId('');
      showToast(reminderType === 'receber' ? 'Lembrete de recebimento cadastrado!' : 'Lembrete de pagamento cadastrado!');
    } catch (err) {
      console.error('Erro ao criar lembrete:', err);
      showToast('Erro ao salvar lembrete.');
    }
  };

  const handleDeleteBillReminderClick = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Lembrete',
      message: 'Deseja excluir este lembrete de conta permanentemente?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBillReminder(id);
          setBillReminders(prev => prev.filter(r => r.id !== id));
          showToast('Lembrete excluído com sucesso.');
        } catch (err) {
          showToast('Erro ao excluir lembrete.');
        }
      }
    });
  };

  const handleConfirmPayBillReminder = async (
    reminder: BillReminder,
    recordTransaction: boolean,
    selectedBankId?: string
  ) => {
    try {
      const isReceivable = reminder.type === 'receber';
      
      // 1. If user chose to record as transaction
      if (recordTransaction) {
        // Find suitable category
        let catId = reminder.categoryId;
        if (!catId) {
          catId = reminder.flowType === 'pessoal' ? 'pessoal_outros' : 'comercio_outros';
        }

        // Add transaction
        const titleTx = isReceivable ? `Recebimento: ${reminder.title}` : `Pagamento: ${reminder.title}`;
        await addTransaction({
          title: titleTx,
          amount: reminder.amount,
          date: new Date().toISOString().split('T')[0],
          type: isReceivable ? 'receita' : 'despesa',
          flowType: reminder.flowType,
          categoryId: catId,
          notes: isReceivable 
            ? `Recebimento confirmado. Frequência: ${reminder.frequency}. ${reminder.notes || ''}`
            : `Lembrete pago. Frequência: ${reminder.frequency}. ${reminder.notes || ''}`,
          paymentMethod: 'pix'
        });

        // Deduct or add from/to bank balance if bank was selected
        if (selectedBankId) {
          const bankObj = banks.find(b => b.id === selectedBankId);
          if (bankObj) {
            const nextBalance = isReceivable 
              ? bankObj.balance + reminder.amount 
              : bankObj.balance - reminder.amount;
            await updateBank(selectedBankId, { balance: nextBalance });
            setBanks(prev => prev.map(b => b.id === selectedBankId ? { ...b, balance: nextBalance } : b));
          }
        }

        // Refresh transactions list in the parent
        await onRefreshTransactions();
      }

      // 2. Handle recurrence date calculation or finish
      if (reminder.frequency === 'unico') {
        await updateBillReminder(reminder.id, { status: 'pago' });
        setBillReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, status: 'pago' } : r));
        showToast(isReceivable ? 'Lançamento marcado como recebido!' : 'Conta marcada como paga!');
      } else {
        // Recurring bill: calculate next due date
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
        showToast(isReceivable 
          ? `Lançamento recebido! Próximo vencimento atualizado para ${nextDate}.` 
          : `Conta paga! Próximo vencimento atualizado para ${nextDate}.`
        );
      }
    } catch (err) {
      console.error('Erro ao processar lembrete:', err);
      showToast(reminder.type === 'receber' ? 'Erro ao processar o recebimento.' : 'Erro ao processar o pagamento.');
    }
  };

  // --- SHOPPING LIST / PURCHASE ORDERS LOGIC ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return;

    const cat = orderCategory.trim() || 'Geral';

    try {
      const newOrder = await addOrderItem({
        name: orderName.trim(),
        quantity: 1,
        status: 'pendente',
        priority: 'media',
        category: cat
      });
      setOrders(prev => [newOrder, ...prev]);
      setOrderName('');
      showToast(`"${orderName}" adicionado à lista de "${cat}"!`);
    } catch (err) {
      showToast('Erro ao criar item na lista.');
    }
  };

  const handleClearAllOrders = () => {
    setConfirmState({
      isOpen: true,
      title: 'Limpar Todas as Listas',
      message: 'Tem certeza que deseja apagar TODOS os itens de todas as listas? Esta ação não poderá ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await clearAllOrderItems();
          setOrders([]);
          showToast('Lista de compras totalmente limpa!');
        } catch (err) {
          showToast('Erro ao limpar a lista.');
        }
      }
    });
  };

  const handleClearCategoryOrders = async (categoryName: string) => {
    try {
      const itemsToClear = orders.filter(o => (o.category || 'Geral') === categoryName);
      for (const item of itemsToClear) {
        await deleteOrderItem(item.id);
      }
      setOrders(prev => prev.filter(o => (o.category || 'Geral') !== categoryName));
      showToast(`Todos os itens de "${categoryName}" foram apagados!`);
    } catch (err) {
      showToast('Erro ao apagar itens da lista.');
    }
  };

  const handleToggleOrderStatus = async (item: OrderItem) => {
    const nextStatus: OrderItem['status'] = item.status === 'pendente' ? 'comprado' : 'pendente';
    try {
      await updateOrderItem(item.id, { status: nextStatus });
      setOrders(prev => prev.map(o => o.id === item.id ? { ...o, status: nextStatus } : o));
      showToast(nextStatus === 'comprado' ? 'Item marcado como comprado!' : 'Item reaberto.');
    } catch (err) {
      showToast('Erro ao atualizar status.');
    }
  };

  const handleDeleteOrderClick = async (id: string) => {
    try {
      await deleteOrderItem(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      showToast('Item removido da lista.');
    } catch (err) {
      showToast('Erro ao excluir item.');
    }
  };

  const handleLaunchOrderAsExpense = async (item: OrderItem) => {
    try {
      const unitPrice = item.priceEstimate || 0;
      if (unitPrice <= 0) {
        showToast('Adicione uma estimativa de preço ao item para lançar como despesa.');
        return;
      }

      const totalAmount = unitPrice * item.quantity;
      
      // Let's look up "comercio_compra_estoque" category
      const targetCategory = categories.find(c => c.id === 'comercio_compra_estoque') || 
                             categories.find(c => c.flowType === 'comercio') || 
                             categories[0];

      await addTransaction({
        title: `Compra: ${item.name} (${item.quantity}x)`,
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        type: 'despesa',
        flowType: 'comercio',
        categoryId: targetCategory.id,
        notes: `Lançado automaticamente a partir da Lista de Pedidos. ${item.notes || ''}`.trim(),
        paymentMethod: 'outro',
        isClosed: false
      });

      // Automatically check the item as comprado if it isn't
      if (item.status === 'pendente') {
        await updateOrderItem(item.id, { status: 'comprado' });
        setOrders(prev => prev.map(o => o.id === item.id ? { ...o, status: 'comprado' } : o));
      }

      await onRefreshTransactions();
      showToast(`Despesa de ${formatBRL(totalAmount)} lançada em Vendas/Despesas!`);
    } catch (err) {
      console.error('Erro ao integrar despesa:', err);
      showToast('Erro ao registrar despesa no sistema.');
    }
  };

  // --- CASH CLOSURE LOGIC ---
  // Unclosed transactions (comercio flow type)
  const openRevenues = transactions.filter(t => !t.isClosed && t.type === 'receita' && t.flowType === 'comercio');
  const openExpenses = transactions.filter(t => !t.isClosed && t.type === 'despesa' && t.flowType === 'comercio');

  // Calculate entrance totals by exact payment method as requested
  const totalDinheiroEntrada = openRevenues
    .filter(t => t.paymentMethod === 'dinheiro')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPix = openRevenues
    .filter(t => t.paymentMethod === 'pix')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCartaoCredito = openRevenues
    .filter(t => t.paymentMethod === 'cartao_credito')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCartaoDebito = openRevenues
    .filter(t => t.paymentMethod === 'cartao_debito')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutrosEntrada = openRevenues
    .filter(t => t.paymentMethod === 'outro' || !t.paymentMethod)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEntradas = totalDinheiroEntrada + totalPix + totalCartaoCredito + totalCartaoDebito + totalOutrosEntrada;

  // Calculate outputs (Vales / unclosed expenses) by payment method
  const totalDinheiroVales = openExpenses
    .filter(t => t.paymentMethod === 'dinheiro')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPixVales = openExpenses
    .filter(t => t.paymentMethod === 'pix')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCartaoCreditoVales = openExpenses
    .filter(t => t.paymentMethod === 'cartao_credito')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCartaoDebitoVales = openExpenses
    .filter(t => t.paymentMethod === 'cartao_debito')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutrosVales = openExpenses
    .filter(t => t.paymentMethod === 'outro' || !t.paymentMethod)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalVales = totalDinheiroVales + totalPixVales + totalCartaoCreditoVales + totalCartaoDebitoVales + totalOutrosVales;

  // Cards combined for bank deposit calculations
  const totalCards = totalCartaoCredito + totalCartaoDebito;
  const discountAmount = totalCards * (cardDiscountRate / 100);

  // Net calculations for each method (Revenues minus Vales of the same payment method)
  const netCashAmount = totalDinheiroEntrada - totalDinheiroVales;
  const netPixAmount = totalPix - totalPixVales;
  
  const discountCredito = totalCartaoCredito * (cardDiscountRate / 100);
  const netCreditCardAmount = totalCartaoCredito - discountCredito - totalCartaoCreditoVales;

  const discountDebito = totalCartaoDebito * (cardDiscountRate / 100);
  const netDebitCardAmount = totalCartaoDebito - discountDebito - totalCartaoDebitoVales;

  const netOutrosAmount = totalOutrosEntrada - totalOutrosVales;

  const totalToDeposit = netCashAmount + netPixAmount + netCreditCardAmount + netDebitCardAmount + netOutrosAmount;

  // Manual Mode calculation helpers
  const valDinNum = parseFloat(manualDinheiro.replace(',', '.')) || 0;
  const valPixNum = parseFloat(manualPix.replace(',', '.')) || 0;
  const valCredNum = parseFloat(manualCredito.replace(',', '.')) || 0;
  const valDebNum = parseFloat(manualDebito.replace(',', '.')) || 0;
  const valOutNum = parseFloat(manualOutros.replace(',', '.')) || 0;

  // Derive vales/outflows dynamically from manualOutflows array
  const valValeDinNum = manualOutflows
    .filter(o => o.paymentMethod === 'dinheiro')
    .reduce((sum, o) => sum + o.amount, 0);

  const valValePixNum = manualOutflows
    .filter(o => o.paymentMethod === 'pix')
    .reduce((sum, o) => sum + o.amount, 0);

  const valValeCredNum = manualOutflows
    .filter(o => o.paymentMethod === 'cartao_credito')
    .reduce((sum, o) => sum + o.amount, 0);

  const valValeDebNum = manualOutflows
    .filter(o => o.paymentMethod === 'cartao_debito')
    .reduce((sum, o) => sum + o.amount, 0);

  const valValeOutNum = manualOutflows
    .filter(o => o.paymentMethod === 'outro')
    .reduce((sum, o) => sum + o.amount, 0);

  const manualTotalEntradas = valDinNum + valPixNum + valCredNum + valDebNum + valOutNum;
  const manualTotalVales = valValeDinNum + valValePixNum + valValeCredNum + valValeDebNum + valValeOutNum;

  const manualDiscountCredito = valCredNum * (cardDiscountRate / 100);
  const manualDiscountDebito = valDebNum * (cardDiscountRate / 100);

  const manualNetCash = valDinNum - valValeDinNum;
  const manualNetPix = valPixNum - valValePixNum;
  const manualNetCreditoCard = valCredNum - manualDiscountCredito - valValeCredNum;
  const manualNetDebitoCard = valDebNum - manualDiscountDebito - valValeDebNum;
  const manualNetOutros = valOutNum - valValeOutNum;

  const manualTotalToDeposit = manualNetCash + manualNetPix + manualNetCreditoCard + manualNetDebitoCard + manualNetOutros;

  // Inline Category Creator for Manual Outflows (Vales de Fechamento)
  const handleCreateManualOutflowCategory = async () => {
    const name = newManualOutflowCategoryName.trim();
    if (!name) return;

    setIsCreatingManualOutflowCategory(true);
    try {
      const newCat = await addCategory({
        name,
        color: '#f87171', // Red/rose accent for expenses
        icon: 'Receipt',
        flowType: 'comercio'
      });
      await onRefreshTransactions();
      setManualOutflowCategoryId(newCat.id);
      setNewManualOutflowCategoryName('');
      setIsCreatingManualOutflowCategory(false);
      showToast(`Categoria "${name}" criada com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar categoria.');
    } finally {
      setIsCreatingManualOutflowCategory(false);
    }
  };

  // Delete Category for Manual Outflows (Vales de Fechamento)
  const handleDeleteManualOutflowCategory = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Categoria',
      message: `Tem certeza de que deseja excluir a categoria "${name}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCategory(id);
          await onRefreshTransactions();
          showToast(`Categoria "${name}" excluída com sucesso!`);
          if (manualOutflowCategoryId === id) {
            setManualOutflowCategoryId('');
          }
        } catch (err) {
          console.error(err);
          showToast('Erro ao excluir categoria.');
        }
      }
    });
  };

  // Add outflow to temporary list
  const handleAddManualOutflow = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = parseFloat(manualOutflowAmount.replace(',', '.'));
    if (!manualOutflowTitle.trim()) {
      showToast('Insira uma descrição para a saída (ex: Frango, Coca-Cola).');
      return;
    }
    if (!manualOutflowCategoryId) {
      showToast('Selecione ou crie uma categoria para esta saída.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('Insira um valor válido maior que zero.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      title: manualOutflowTitle.trim().toUpperCase(),
      categoryId: manualOutflowCategoryId,
      amount,
      paymentMethod: manualOutflowPaymentMethod,
      date: manualOutflowDate || new Date().toISOString().split('T')[0]
    };

    setManualOutflows(prev => [...prev, newItem]);
    setManualOutflowTitle('');
    setManualOutflowAmount('');
    setManualOutflowDate(new Date().toISOString().split('T')[0]);
    showToast(`Saída "${newItem.title}" adicionada!`);
  };

  const handleRemoveManualOutflow = (id: string) => {
    setManualOutflows(prev => prev.filter(o => o.id !== id));
    showToast('Saída removida do fechamento.');
  };

  // Adaptive variables depending on the active closure mode
  const netPixDisplay = closureMode === 'manual' ? manualNetPix : netPixAmount;
  const netCredDisplay = closureMode === 'manual' ? manualNetCreditoCard : netCreditCardAmount;
  const netDebDisplay = closureMode === 'manual' ? manualNetDebitoCard : netDebitCardAmount;
  const netCashDisplay = closureMode === 'manual' ? manualNetCash : netCashAmount;
  const netOutrosDisplay = closureMode === 'manual' ? manualNetOutros : netOutrosAmount;
  const finalTotalToDeposit = closureMode === 'manual' ? manualTotalToDeposit : totalToDeposit;

  // Inline Category Creator for Vales
  const handleCreateValeCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newValeCategoryName.trim();
    if (!name) return;

    setIsCreatingValeCategory(true);
    try {
      const newCat = await addCategory({
        name,
        color: '#f87171', // Red/rose accent for expenses
        icon: 'Receipt',
        flowType: 'comercio'
      });
      await onRefreshTransactions();
      setValeCategoryId(newCat.id);
      setNewValeCategoryName('');
      showToast(`Categoria "${name}" criada para vales com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar categoria de vale.');
    } finally {
      setIsCreatingValeCategory(false);
    }
  };

  // Inline Vale Creator (Saída de Caixa)
  const handleAddVale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(valeAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      showToast('Insira um valor válido para o vale.');
      return;
    }

    if (!valeTitle.trim()) {
      showToast('Insira uma descrição para o vale.');
      return;
    }

    if (!valeCategoryId) {
      showToast('Selecione uma categoria para o vale.');
      return;
    }

    setIsAddingVale(true);
    try {
      await addTransaction({
        title: valeTitle.trim().toUpperCase(),
        amount,
        date: valeDate || new Date().toISOString().split('T')[0],
        type: 'despesa',
        flowType: 'comercio',
        categoryId: valeCategoryId,
        paymentMethod: valePaymentMethod,
        isClosed: false
      });

      setValeAmount('');
      setValeTitle('');
      setValeDate(new Date().toISOString().split('T')[0]);
      showToast('Vale registrado com sucesso!');
      await onRefreshTransactions();
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar vale.');
    } finally {
      setIsAddingVale(false);
    }
  };

  // Perform Cash closure
  const handleExecuteClosure = async () => {
    if (openRevenues.length === 0 && openExpenses.length === 0) {
      showToast('Nenhum lançamento (entrada ou vale) em aberto para fechar.');
      return;
    }

    if (banks.length === 0) {
      showToast('Você precisa cadastrar ao menos um banco para receber os depósitos.');
      return;
    }

    setIsClosingCaixa(true);
    try {
      // 1. Save closure document
      const closureDate = new Date().toISOString().split('T')[0];
      const transactionIds = [...openRevenues.map(t => t.id), ...openExpenses.map(t => t.id)];

      const savedClosure = await addClosure({
        date: closureDate,
        totalPix,
        totalCards,
        totalCash: totalDinheiroEntrada,
        cardDiscountRate,
        netCardsAmount: netCreditCardAmount + netDebitCardAmount,
        depositedBankIdPix: pixBankId || undefined,
        depositedBankIdCards: creditCardBankId || undefined,
        notes: `${closureNotes.trim()}${totalVales > 0 ? ` | Vales descontados das respectivas contas: R$ ${totalVales.toFixed(2)}` : ''}` || undefined,
        transactionIds
      });

      // 2. Add/subtract values to the selected banks

      // Deposit net PIX (Pix entrance - Pix vales)
      if (netPixAmount !== 0 && pixBankId) {
        const targetBank = banks.find(b => b.id === pixBankId);
        if (targetBank) {
          const newBalance = targetBank.balance + netPixAmount;
          await updateBank(pixBankId, { balance: newBalance });
        }
      }

      // Deposit net Credit Card (Credit Card entrance - Discount - Credit Card vales)
      if (netCreditCardAmount !== 0 && creditCardBankId) {
        const targetBank = banks.find(b => b.id === creditCardBankId);
        if (targetBank) {
          const newBalance = targetBank.balance + netCreditCardAmount;
          await updateBank(creditCardBankId, { balance: newBalance });
        }
      }

      // Deposit net Debit Card (Debit Card entrance - Discount - Debit Card vales)
      if (netDebitCardAmount !== 0 && debitCardBankId) {
        const targetBank = banks.find(b => b.id === debitCardBankId);
        if (targetBank) {
          const newBalance = targetBank.balance + netDebitCardAmount;
          await updateBank(debitCardBankId, { balance: newBalance });
        }
      }

      // Deposit Cash remaining sum (Dinheiro Entrada - Dinheiro Vales) - Goes to Cofre
      if (netCashAmount !== 0 && cashBankId) {
        const targetBank = banks.find(b => b.id === cashBankId);
        if (targetBank) {
          const newBalance = targetBank.balance + netCashAmount;
          await updateBank(cashBankId, { balance: newBalance });
        }
      }

      // Deposit Outros remaining sum
      if (netOutrosAmount !== 0 && cashBankId) {
        const targetBank = banks.find(b => b.id === cashBankId);
        if (targetBank) {
          const newBalance = targetBank.balance + netOutrosAmount;
          await updateBank(cashBankId, { balance: newBalance });
        }
      }

      // 3. Mark all transactions as closed in Firestore/Local
      for (const tx of openRevenues) {
        await updateTransactionStatus(tx.id, { isClosed: true, closureId: savedClosure.id });
      }
      for (const tx of openExpenses) {
        await updateTransactionStatus(tx.id, { isClosed: true, closureId: savedClosure.id });
      }

      // Refresh application state
      await onRefreshTransactions();
      showToast('Caixa comercial fechado com sucesso! Saldos e vales integrados.');
      setClosureNotes('');
      
      // Reload everything
      await loadData();
    } catch (err) {
      console.error('Erro no fechamento de caixa:', err);
      showToast('Falha ao fechar caixa.');
    } finally {
      setIsClosingCaixa(false);
    }
  };

  // Perform Direct Manual Cash Closure
  const handleExecuteManualClosure = async () => {
    if (banks.length === 0) {
      showToast('Você precisa cadastrar ao menos um banco para receber os depósitos.');
      return;
    }
 
    const valDinheiro = parseFloat(manualDinheiro.replace(',', '.')) || 0;
    const valPix = parseFloat(manualPix.replace(',', '.')) || 0;
    const valCredito = parseFloat(manualCredito.replace(',', '.')) || 0;
    const valDebito = parseFloat(manualDebito.replace(',', '.')) || 0;
    const valOutros = parseFloat(manualOutros.replace(',', '.')) || 0;
 
    const valValeDinheiro = valValeDinNum;
    const valValePix = valValePixNum;
    const valValeCredito = valValeCredNum;
    const valValeDebito = valValeDebNum;
    const valValeOutros = valValeOutNum;
 
    const totalManEntradas = valDinheiro + valPix + valCredito + valDebito + valOutros;
    if (totalManEntradas <= 0) {
      showToast('Insira ao menos um valor de entrada válido para realizar o fechamento.');
      return;
    }
 
    setIsClosingCaixa(true);
    try {
      // 1. Calculate discounts & net values
      const discountCredito = valCredito * (cardDiscountRate / 100);
      const discountDebito = valDebito * (cardDiscountRate / 100);
 
      const netCash = valDinheiro - valValeDinheiro;
      const netPix = valPix - valValePix;
      const netCreditoCard = valCredito - discountCredito - valValeCredito;
      const netDebitoCard = valDebito - discountDebito - valValeDebito;
      const netOutros = valOutros - valValeOutros;
 
      const totalValesMan = valValeDinheiro + valValePix + valValeCredito + valValeDebito + valValeOutros;
 
      // 2. Generate closed transactions in the DB so that they are accounted for in statistics and reports
      const defaultCategory = categories.find(c => c.flowType === 'comercio') || categories[0];
      const categoryId = defaultCategory ? defaultCategory.id : '';
 
      const generatedTransactionIds: string[] = [];
 
      const createClosedTx = async (title: string, amount: number, type: 'receita' | 'despesa', method: PaymentMethod, notesText?: string, catId?: string, customDate?: string) => {
        const tx = await addTransaction({
          title: title.toUpperCase(),
          amount,
          date: customDate || manualDate,
          type,
          flowType: 'comercio',
          categoryId: catId || categoryId,
          paymentMethod: method,
          notes: notesText || `Lançado no Fechamento de Caixa Diário de ${customDate || manualDate}`,
          isClosed: true
        });
        generatedTransactionIds.push(tx.id);
      };
 
      // Create revenue records for each payment method
      if (valDinheiro > 0) await createClosedTx('FECHAMENTO DE CAIXA: ENTRADA DINHEIRO', valDinheiro, 'receita', 'dinheiro');
      if (valPix > 0) await createClosedTx('FECHAMENTO DE CAIXA: ENTRADA PIX', valPix, 'receita', 'pix');
      if (valCredito > 0) await createClosedTx('FECHAMENTO DE CAIXA: ENTRADA C. CRÉDITO', valCredito, 'receita', 'cartao_credito');
      if (valDebito > 0) await createClosedTx('FECHAMENTO DE CAIXA: ENTRADA C. DÉBITO', valDebito, 'receita', 'cartao_debito');
      if (valOutros > 0) await createClosedTx('FECHAMENTO DE CAIXA: ENTRADA OUTROS', valOutros, 'receita', 'outro');
 
      // Create custom expense records for each item in the manualOutflows list
      for (const outflow of manualOutflows) {
        await createClosedTx(
          `FECHAMENTO DE CAIXA: ${outflow.title}`,
          outflow.amount,
          'despesa',
          outflow.paymentMethod,
          `Vale/Saída ("${outflow.title}") do dia ${outflow.date || manualDate} descontado no Fechamento de Caixa de ${manualDate}`,
          outflow.categoryId,
          outflow.date
        );
      }

      // 3. Save the closure document
      await addClosure({
        date: manualDate,
        totalPix: valPix,
        totalCards: valCredito + valDebito,
        totalCash: valDinheiro,
        cardDiscountRate,
        netCardsAmount: (valCredito - discountCredito) + (valDebito - discountDebito),
        depositedBankIdPix: pixBankId || undefined,
        depositedBankIdCards: creditCardBankId || undefined,
        notes: `${closureNotes.trim()}${totalValesMan > 0 ? ` | Vales/Saídas declarados: R$ ${totalValesMan.toFixed(2)}` : ''}` || undefined,
        transactionIds: generatedTransactionIds
      });

      // 4. Update the balances of the selected banks
      // Deposit PIX Net
      if (netPix !== 0 && pixBankId) {
        const targetBank = banks.find(b => b.id === pixBankId);
        if (targetBank) {
          await updateBank(pixBankId, { balance: targetBank.balance + netPix });
        }
      }

      // Deposit net Credit Card
      if (netCreditoCard !== 0 && creditCardBankId) {
        const targetBank = banks.find(b => b.id === creditCardBankId);
        if (targetBank) {
          await updateBank(creditCardBankId, { balance: targetBank.balance + netCreditoCard });
        }
      }

      // Deposit net Debit Card
      if (netDebitoCard !== 0 && debitCardBankId) {
        const targetBank = banks.find(b => b.id === debitCardBankId);
        if (targetBank) {
          await updateBank(debitCardBankId, { balance: targetBank.balance + netDebitoCard });
        }
      }

      // Deposit net Cash (Cofre)
      if (netCash !== 0 && cashBankId) {
        const targetBank = banks.find(b => b.id === cashBankId);
        if (targetBank) {
          await updateBank(cashBankId, { balance: targetBank.balance + netCash });
        }
      }

      // Deposit net Outros
      if (netOutros !== 0 && cashBankId) {
        const targetBank = banks.find(b => b.id === cashBankId);
        if (targetBank) {
          await updateBank(cashBankId, { balance: targetBank.balance + netOutros });
        }
      }

      // 5. Success cleanup
      await onRefreshTransactions();
      showToast('Fechamento de Caixa Diário registrado com sucesso! Saldos atualizados.');
      
      // Clear manual fields
      setManualDinheiro('');
      setManualPix('');
      setManualCredito('');
      setManualDebito('');
      setManualOutros('');
      setManualValesDinheiro('');
      setManualValesPix('');
      setManualValesCredito('');
      setManualValesDebito('');
      setManualValesOutros('');
      setClosureNotes('');
      setManualOutflows([]);
      setManualOutflowTitle('');
      setManualOutflowCategoryId('');
      setManualOutflowAmount('');
      setManualOutflowPaymentMethod('dinheiro');

      // Reload list of closures
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar fechamento manual.');
    } finally {
      setIsClosingCaixa(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportAllData();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `backup_financeiro_comercial_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Cópia de segurança gerada e baixada com sucesso! Guarde este arquivo em um local seguro.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar cópia de segurança.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmState({
      isOpen: true,
      title: 'Importar Cópia de Segurança',
      message: '🚨 ATENÇÃO: Ao importar este backup, todos os seus dados atuais (bancos, anotações, lembretes, compras, fechamentos e lançamentos) serão APAGADOS e substituídos pelos dados do arquivo. Esta ação é definitiva e não pode ser desfeita. Deseja prosseguir?',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setIsImporting(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const text = event.target?.result;
              if (typeof text !== 'string') throw new Error('Falha ao ler arquivo.');
              const parsed = JSON.parse(text);
              
              await importAllData(parsed);
              showToast('Dados importados com sucesso! Sincronizando e recarregando...');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } catch (err: any) {
              console.error(err);
              showToast('Erro ao ler ou processar o arquivo. Certifique-se de escolher um arquivo .json de backup válido.');
              setIsImporting(false);
            }
          };
          reader.readAsText(file);
        } catch (err) {
          console.error(err);
          showToast('Erro ao ler o arquivo de backup.');
          setIsImporting(false);
        }
      }
    });
  };

  // Helper formats
  const formatBRL = (val: number) => {
    if (!showBalances) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    return due < today;
  };

  // Filter notes/reminders list
  const filteredNotes = notes.filter(n => {
    if (noteFilter === 'notas') return n.type === 'nota';
    if (noteFilter === 'lembretes_pendentes') return n.type === 'lembrete' && !n.isCompleted;
    if (noteFilter === 'lembretes_concluidos') return n.type === 'lembrete' && n.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* CONTROL SUB-BAR */}
      {!hideOtherSubTabs && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl">
              <LucideIcon name="Briefcase" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Workspace de Gestão Comercial</h3>
              <p className="text-[11px] text-slate-400">Gerencie contas bancárias, fechamentos, anotações e lista de compras/pedidos</p>
            </div>
          </div>

          {/* WORKSPACE NAVIGATION */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto self-stretch sm:self-center shrink-0 overflow-x-auto scrollbar-none gap-0.5">
            <button
              onClick={() => setActiveSubTab('bancos')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'bancos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LucideIcon name="PiggyBank" size={14} />
              Meus Bancos ({banks.length})
            </button>
            <button
              onClick={() => setActiveSubTab('notas')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'notas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LucideIcon name="StickyNote" size={14} />
              Notas & Lembretes ({notes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('pedidos')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'pedidos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LucideIcon name="ShoppingCart" size={14} />
              Lista de Pedidos ({orders.length})
            </button>
            <button
              onClick={() => setActiveSubTab('lembretes')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'lembretes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LucideIcon name="CalendarDays" size={14} />
              Contas a Pagar & Receber ({billReminders.length})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-3 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Sincronizando dados...</p>
        </div>
      ) : (
        <div
          key={activeSubTab}
          className="animate-tab-fade"
        >
            {/* ======================================================= */}
            {/* SUB-VIEW: BANCOS E CONTAS */}
            {/* ======================================================= */}
            {activeSubTab === 'bancos' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      Contas e Caixas Cadastrados
                      <button
                        type="button"
                        onClick={toggleShowBalances}
                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
                        title={showBalances ? "Ocultar saldos" : "Mostrar saldos"}
                      >
                        <LucideIcon name={showBalances ? "EyeOff" : "Eye"} size={14} />
                      </button>
                    </h4>
                    <p className="text-xs text-slate-400">Cadastre suas contas digitais, tradicionais ou caixas físicos para receber depósitos automatizados do comércio.</p>
                  </div>
                  <button
                    onClick={() => setIsAddingBank(!isAddingBank)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <LucideIcon name={isAddingBank ? 'X' : 'Plus'} size={14} />
                    {isAddingBank ? 'Cancelar' : 'Cadastrar Novo Banco'}
                  </button>
                </div>

                {/* ADD BANK COMPACT FORM */}
                <AnimatePresence>
                  {isAddingBank && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleCreateBank} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-6 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">💡 Sugestões de Bancos (Preenchimento Automático)</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: 'Banco do Brasil', color: '#facc15', type: 'tradicional' },
                              { name: 'Banco Inter', color: '#f97316', type: 'digital' },
                              { name: 'Nubank', color: '#a855f7', type: 'digital' },
                              { name: 'Banco Itaú', color: '#ea580c', type: 'tradicional' },
                              { name: 'Bradesco', color: '#dc2626', type: 'tradicional' },
                              { name: 'Santander', color: '#e11d48', type: 'tradicional' },
                              { name: 'Caixa Federal', color: '#0284c7', type: 'tradicional' }
                            ].map(preset => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  setBankName(preset.name);
                                  setBankType(preset.type as Bank['type']);
                                  setBankColor(preset.color);
                                }}
                                className="px-3 py-1.5 text-[10px] font-bold border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all active:scale-95"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome da Instituição</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Banco Itaú, Nubank, Caixa Loja"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                            />
                          </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo da Conta</label>
                          <select
                            value={bankType}
                            onChange={(e) => setBankType(e.target.value as Bank['type'])}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                          >
                            <option value="digital">Conta Digital (PIX/Ted)</option>
                            <option value="tradicional">Conta Corrente Tradicional</option>
                            <option value="carteira">Dinheiro Físico / Caixa</option>
                            <option value="outro">Outro Tipo de Ativo</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo Inicial (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            placeholder="0,00"
                            value={bankBalance}
                            onChange={(e) => setBankBalance(e.target.value)}
                            className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                          />
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cor de Destaque</label>
                            <div className="flex gap-2 items-center">
                              <input 
                                type="color" 
                                value={bankColor}
                                onChange={(e) => setBankColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden shrink-0" 
                              />
                              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">{bankColor}</span>
                            </div>
                          </div>
                          
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer h-[36px]"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* BANKS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {banks.map(b => (
                    <div 
                      key={b.id} 
                      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:border-slate-200 transition-all flex flex-col justify-between min-h-[140px]"
                      style={{ borderLeftWidth: '5px', borderLeftColor: b.color }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{b.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                            {b.type === 'digital' && '⚡ Conta Digital'}
                            {b.type === 'tradicional' && '🏦 Banco Tradicional'}
                            {b.type === 'carteira' && '💵 Caixa / Carteira'}
                            {b.type === 'outro' && '🔄 Outros Ativos'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Edit balance */}
                          <button
                            onClick={() => {
                              setEditingBankId(b.id);
                              setEditingBalance(b.balance.toString());
                            }}
                            title="Ajustar saldo manualmente"
                            className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-50 transition-colors"
                          >
                            <LucideIcon name="Edit3" size={13} />
                          </button>
                          
                          {/* Delete bank */}
                          <button
                            onClick={() => handleDeleteBankClick(b.id, b.name)}
                            title="Excluir banco"
                            className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <LucideIcon name="Trash2" size={13} />
                          </button>
                        </div>
                      </div>

                      {/* BALANCE SECTION */}
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Atualizado</span>
                          {editingBankId === b.id ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="text"
                                value={editingBalance}
                                onChange={(e) => setEditingBalance(e.target.value)}
                                className="w-24 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-slate-200"
                              />
                              <button
                                onClick={() => handleUpdateBalance(b.id)}
                                className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                              >
                                <LucideIcon name="Check" size={12} />
                              </button>
                              <button
                                onClick={() => setEditingBankId(null)}
                                className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"
                              >
                                <LucideIcon name="X" size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-lg font-black font-mono text-slate-800">
                              {formatBRL(b.balance)}
                            </span>
                          )}
                        </div>

                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                          <LucideIcon name={
                            b.type === 'carteira' ? 'Wallet' : 
                            b.type === 'digital' ? 'Smartphone' : 'CreditCard'
                          } size={18} style={{ color: b.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* SUB-VIEW: FECHAMENTO DE CAIXA */}
            {/* ======================================================= */}
            {activeSubTab === 'fechamento' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Closure Summary & Wizard */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Fechamento de Caixa Unificado do Comércio</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Consolide todas as suas movimentações de entrada por método e desconte vales/saídas antes de transferir para os bancos correspondentes.
                        </p>
                      </div>

                      {/* MODE SWITCHER */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
                        <button
                          type="button"
                          onClick={() => setClosureMode('manual')}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            closureMode === 'manual'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          ✍️ Lançar Totais do Dia
                        </button>
                        <button
                          type="button"
                          onClick={() => setClosureMode('sistema')}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            closureMode === 'sistema'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          💻 Vendas do Sistema ({openRevenues.length + openExpenses.length})
                        </button>
                      </div>
                    </div>

                    {/* ACCESSIBLE HIGH-VISIBILITY CONFIRMATION BANNER */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">🚀 Pronto para salvar?</span>
                        <p className="text-[11px] text-slate-600 leading-tight">
                          Após preencher os totais ou vales do dia, confirme o fechamento para salvar e atualizar os saldos das suas contas de destino.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closureMode === 'manual' ? handleExecuteManualClosure : handleExecuteClosure}
                        disabled={isClosingCaixa || banks.length === 0}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-black tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hover:scale-[1.01]"
                      >
                        {isClosingCaixa ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                            Salvando Lançamento...
                          </>
                        ) : (
                          <>
                            <LucideIcon name="CheckCircle2" size={14} />
                            Confirmar Lançamento (Salvar Fechamento)
                          </>
                        )}
                      </button>
                    </div>

                    {closureMode === 'manual' ? (
                      /* DIRECT MANUAL CLOSURE MODE FORM */
                      <div className="space-y-6 animate-fade-in">
                        {/* 1. Date of Closure */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">📅 Data do Fechamento</span>
                            <span className="text-[10px] text-slate-400">Selecione o dia correspondente ao fechamento</span>
                          </div>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                          />
                        </div>

                        {/* 2. INFLOWS */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="text-emerald-500">📥</span> 1. Entradas de Caixa Comercial (Bruto)
                          </h5>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3">
                            <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl space-y-1">
                              <label className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider block">💵 Dinheiro</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={manualDinheiro}
                                onChange={(e) => setManualDinheiro(e.target.value)}
                                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                            <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl space-y-1">
                              <label className="text-[9px] font-extrabold text-purple-800 uppercase tracking-wider block">⚡ Pix</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={manualPix}
                                onChange={(e) => setManualPix(e.target.value)}
                                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                            <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl space-y-1">
                              <label className="text-[9px] font-extrabold text-blue-800 uppercase tracking-wider block">💳 C. Crédito</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={manualCredito}
                                onChange={(e) => setManualCredito(e.target.value)}
                                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                            <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl space-y-1">
                              <label className="text-[9px] font-extrabold text-indigo-800 uppercase tracking-wider block">💳 C. Débito</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={manualDebito}
                                onChange={(e) => setManualDebito(e.target.value)}
                                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                            <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wider block">❓ Outros</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={manualOutros}
                                onChange={(e) => setManualOutros(e.target.value)}
                                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Soma Total das Entradas:</span>
                            <span className="text-xs font-black text-slate-800 font-mono">{formatBRL(manualTotalEntradas)}</span>
                          </div>
                        </div>

                        {/* 3. OUTFLOWS / VALES */}
                        <div className="space-y-4 pt-2">
                          <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="text-rose-500">📤</span> 2. Vales, Saídas ou Despesas do Dia (Customizado)
                          </h5>

                          {/* Inline Outflow Add Form */}
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-4">
                            <div className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                              ➕ Registrar Nova Saída/Vale
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
                              {/* Title / Description */}
                              <div className="space-y-1 col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Descrição/Nome da Saída</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Frango, Coca-Cola, etc."
                                  value={manualOutflowTitle}
                                  onChange={(e) => setManualOutflowTitle(e.target.value)}
                                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                />
                              </div>

                              {/* Date Selection */}
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Data da Saída</label>
                                <input
                                  type="date"
                                  value={manualOutflowDate}
                                  onChange={(e) => setManualOutflowDate(e.target.value)}
                                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                                />
                              </div>

                              {/* Category Dropdown with Inline Creator */}
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Categoria</label>
                                {isCreatingManualOutflowCategory ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Nova Categoria..."
                                      value={newManualOutflowCategoryName}
                                      onChange={(e) => setNewManualOutflowCategoryName(e.target.value)}
                                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleCreateManualOutflowCategory}
                                      disabled={isCreatingManualOutflowCategory && !newManualOutflowCategoryName.trim()}
                                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                      title="Salvar"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsCreatingManualOutflowCategory(false)}
                                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                      title="Cancelar"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={manualOutflowCategoryId}
                                        onChange={(e) => setManualOutflowCategoryId(e.target.value)}
                                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                                      >
                                        <option value="">Selecione...</option>
                                        {categories
                                          .filter(c => c.flowType === 'comercio')
                                          .map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                              {cat.name}
                                            </option>
                                          ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => setIsCreatingManualOutflowCategory(true)}
                                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer transition-all uppercase"
                                      >
                                        + Nova
                                      </button>
                                    </div>

                                    {/* Active Categories List Manager with deletion */}
                                    <div className="flex flex-wrap gap-1 mt-1.5 max-h-[100px] overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-lg">
                                      <div className="w-full text-[8px] font-black text-slate-400 uppercase tracking-wide">Gerenciar Vales:</div>
                                      {categories
                                        .filter(c => c.flowType === 'comercio')
                                        .map(cat => (
                                          <div
                                            key={cat.id}
                                            className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 transition-all shrink-0"
                                          >
                                            <span>{cat.name}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteManualOutflowCategory(cat.id, cat.name)}
                                              className="text-slate-400 hover:text-rose-600 font-extrabold cursor-pointer transition-colors px-0.5"
                                              title={`Excluir categoria "${cat.name}"`}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      {categories.filter(c => c.flowType === 'comercio').length === 0 && (
                                        <div className="text-[9px] text-slate-400 italic">Crie categorias para vales</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Payment Method / Source */}
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Método de Saída (Dedução)</label>
                                <select
                                  value={manualOutflowPaymentMethod}
                                  onChange={(e) => setManualOutflowPaymentMethod(e.target.value as PaymentMethod)}
                                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                                >
                                  <option value="dinheiro">💵 Dinheiro (Do Caixa)</option>
                                  <option value="pix">⚡ Pix (Conta Digital)</option>
                                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                                  <option value="cartao_debito">💳 Cartão de Débito</option>
                                  <option value="outro">❓ Outro / Vale Especial</option>
                                </select>
                              </div>

                              {/* Amount */}
                              <div className="space-y-1 col-span-2 md:col-span-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Valor (R$)</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={manualOutflowAmount}
                                    onChange={(e) => setManualOutflowAmount(e.target.value)}
                                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddManualOutflow}
                                    className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Outflows List */}
                          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Lista de Saídas Lançadas</span>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">{manualOutflows.length} itens registrados</span>
                            </div>

                            {manualOutflows.length > 0 ? (
                              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                {manualOutflows.map((outflow) => {
                                  const categoryName = categories.find(c => c.id === outflow.categoryId)?.name || 'Outro';
                                  const getPaymentLabel = (method: PaymentMethod) => {
                                    if (method === 'dinheiro') return '💵 Dinheiro';
                                    if (method === 'pix') return '⚡ Pix';
                                    if (method === 'cartao_credito') return '💳 C. Crédito';
                                    if (method === 'cartao_debito') return '💳 C. Débito';
                                    return '❓ Outro';
                                  };

                                  return (
                                    <div key={outflow.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-all text-xs">
                                      <div className="space-y-0.5">
                                        <div className="font-extrabold text-slate-800 uppercase">{outflow.title}</div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase">
                                            {categoryName}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400">
                                            {getPaymentLabel(outflow.paymentMethod)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className="font-mono font-black text-rose-600">
                                          -{formatBRL(outflow.amount)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveManualOutflow(outflow.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                          title="Excluir saída"
                                        >
                                          <LucideIcon name="Trash2" size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-8 text-center bg-slate-50/20 text-slate-400">
                                <p className="text-[11px] font-extrabold uppercase tracking-wide">Nenhuma saída adicionada ainda</p>
                                <p className="text-[10px] text-slate-400 mt-1">Preencha o formulário acima para deduzir frango, bebidas, vales ou suprimentos do caixa.</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total Geral de Vales do Dia:</span>
                            <span className="text-xs font-black text-rose-600 font-mono">-{formatBRL(manualTotalVales)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      openRevenues.length === 0 && openExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-150 p-6">
                        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                          <LucideIcon name="CheckCircle" size={26} />
                        </div>
                        <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tudo em Ordem!</h5>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                          Não há lançamentos de receitas ou vales comerciais pendentes de fechamento.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* WIDGET GRID: ENTRADAS */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="text-emerald-500">📥</span> 1. Entradas de Caixa
                          </h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {/* DINHEIRO */}
                            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider block">💵 Dinheiro</span>
                              <span className="text-xs font-black font-mono text-slate-800 mt-1">{formatBRL(totalDinheiroEntrada)}</span>
                            </div>

                            {/* PIX */}
                            <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-wider block">⚡ Pix</span>
                              <span className="text-xs font-black font-mono text-slate-800 mt-1">{formatBRL(totalPix)}</span>
                            </div>

                            {/* CARTAO CREDITO */}
                            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-extrabold text-blue-700 uppercase tracking-wider block">💳 C. Crédito</span>
                              <span className="text-xs font-black font-mono text-slate-800 mt-1">{formatBRL(totalCartaoCredito)}</span>
                            </div>

                            {/* CARTAO DEBITO */}
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl flex flex-col justify-between">
                              <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-wider block">💳 C. Débito</span>
                              <span className="text-xs font-black font-mono text-slate-800 mt-1">{formatBRL(totalCartaoDebito)}</span>
                            </div>

                            {/* OUTROS/SEM METODO */}
                            <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
                              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">❓ Outros</span>
                              <span className="text-xs font-black font-mono text-slate-800 mt-1">{formatBRL(totalOutrosEntrada)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Soma Total das Entradas:</span>
                            <span className="text-xs font-black text-slate-800 font-mono">{formatBRL(totalEntradas)}</span>
                          </div>
                        </div>

                        {/* WIDGET GRID: SAIDAS & VALES */}
                        <div className="space-y-4 pt-1">
                          <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="text-rose-500">📤</span> 2. Saídas & Vales (Despesas de Caixa)
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* REGISTER NEW VALE INLINE */}
                            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">⚡ Lançar Novo Vale</span>
                                <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.5 font-bold uppercase rounded">Caixa Comercial</span>
                              </div>

                              <form onSubmit={handleAddVale} className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-400 uppercase">Valor do Vale</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ex: 50,00"
                                      value={valeAmount}
                                      onChange={(e) => setValeAmount(e.target.value)}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-400 uppercase">Forma Saída</label>
                                    <select
                                      value={valePaymentMethod}
                                      onChange={(e) => setValePaymentMethod(e.target.value as PaymentMethod)}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                                    >
                                      <option value="dinheiro">Dinheiro</option>
                                      <option value="pix">Pix</option>
                                      <option value="outro">Outro</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase">Data da Saída</label>
                                  <input
                                    type="date"
                                    required
                                    value={valeDate}
                                    onChange={(e) => setValeDate(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase">Descrição do Vale</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ex: Adiantamento João / Compra de Gás"
                                    value={valeTitle}
                                    onChange={(e) => setValeTitle(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase flex items-center justify-between">
                                    <span>Categoria do Vale</span>
                                    <span className="text-[8px] text-indigo-600 font-bold lowercase">adicione novas abaixo se necessário</span>
                                  </label>
                                  
                                  <select
                                    value={valeCategoryId}
                                    onChange={(e) => setValeCategoryId(e.target.value)}
                                    required
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                                  >
                                    <option value="">-- Selecione a Categoria --</option>
                                    {categories
                                      .filter(c => c.flowType === 'comercio' || c.flowType === 'ambas')
                                      .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))
                                    }
                                  </select>
                                </div>

                                <button
                                  type="submit"
                                  disabled={isAddingVale}
                                  className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold tracking-wider cursor-pointer transition-colors"
                                >
                                  {isAddingVale ? 'Registrando...' : 'Lançar Saída de Caixa'}
                                </button>
                              </form>

                              {/* INLINE CATEGORY CREATOR */}
                              <div className="pt-2 border-t border-slate-100 space-y-1">
                                <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Criar Nova Categoria de Vale (Ex: água, energia, frangos...)</label>
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="text"
                                    placeholder="Ex: energia, água, frangos..."
                                    value={newValeCategoryName}
                                    onChange={(e) => setNewValeCategoryName(e.target.value)}
                                    className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateValeCategory();
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCreateValeCategory()}
                                    disabled={isCreatingValeCategory || !newValeCategoryName.trim()}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold cursor-pointer shrink-0 disabled:bg-slate-200 disabled:text-slate-400"
                                  >
                                    + Criar Categoria
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* LIST OF UNCLOSED VALES */}
                            <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-between">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Vales / Retiradas de Hoje</span>
                                  <span className="text-[10px] text-rose-600 font-extrabold font-mono">Total: {formatBRL(totalVales)}</span>
                                </div>

                                {openExpenses.length === 0 ? (
                                  <div className="text-center py-12 text-slate-400 text-[11px] italic bg-slate-50 rounded-xl border border-dashed border-slate-150">
                                    Nenhum vale ou despesa de caixa pendente.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {openExpenses.map(val => {
                                      const cat = categories.find(c => c.id === val.categoryId);
                                      return (
                                        <div key={val.id} className="p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center justify-between text-xs hover:bg-rose-50 transition-all">
                                          <div>
                                            <span className="font-extrabold text-slate-800 uppercase tracking-tight block">{val.title}</span>
                                            <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 rounded font-bold uppercase mt-0.5 inline-block">
                                              {cat ? cat.name : 'Vale Geral'}
                                            </span>
                                          </div>
                                          <span className="font-black text-rose-600 font-mono">-{formatBRL(val.amount)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span>Saldo Líquido em Dinheiro:</span>
                                <span className={`font-mono text-xs ${netCashAmount >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}`}>
                                  {formatBRL(netCashAmount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CONFIG CLOSURE TAX / RATE */}
                        <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                          <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="Settings" size={12} className="text-slate-500" />
                            Ajustes de Integração de Cartões
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desconto de Taxa Cartão (%)</label>
                                <span className="text-[10px] text-amber-600 font-extrabold">{formatBRL(closureMode === 'manual' ? (manualDiscountCredito + manualDiscountDebito) : discountAmount)} retido</span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={cardDiscountRate}
                                  onChange={(e) => setCardDiscountRate(parseFloat(e.target.value) || 0)}
                                  className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-200 pr-8"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium">Insira a taxa cobrada pela maquininha para calcular o valor real líquido.</p>
                            </div>

                            <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Líquido dos Cartões</span>
                              <span className="text-base font-black font-mono text-emerald-600 mt-1">{formatBRL(netCredDisplay + netDebDisplay)}</span>
                            </div>
                          </div>
                        </div>

                        {/* SYSTEM RESET / DANGER ZONE */}
                        <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-3">
                          <h5 className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="AlertTriangle" size={12} className="text-rose-600 animate-pulse" />
                            Zona de Perigo (Ações do Sistema)
                          </h5>
                          <p className="text-[10px] text-rose-700 font-semibold leading-relaxed">
                            Caso queira limpar todos os registros do aplicativo para começar a usar do zero, clique no botão abaixo. 
                            Isto irá <strong>apagar permanentemente</strong> todos os lançamentos, fechamentos, anotações, lembretes de contas, listas de compras, categorias personalizadas e irá <strong>zerar todos os saldos de contas e bancos</strong>.
                          </p>
                          <button
                            type="button"
                            onClick={handleResetSystemData}
                            disabled={isResetting}
                            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                          >
                            {isResetting ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Zerando todo o histórico...
                              </>
                            ) : (
                              <>
                                <LucideIcon name="Trash2" size={13} />
                                Apagar Todos os Lançamentos e Começar do Zero
                              </>
                            )}
                          </button>
                        </div>

                        {/* SELECT TARGET DEPOSIT ACCOUNTS */}
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <LucideIcon name="ArrowRightLeft" size={12} className="text-slate-500" />
                              Contas de Destino para Integração dos Saldos
                            </h5>
                            <span className="text-[9px] bg-slate-900 text-white font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">
                              Somente Conta Comercial
                            </span>
                          </div>

                          {banks.length === 0 ? (
                            <p className="text-xs text-rose-500 font-bold">⚠️ Cadastre ao menos um banco na aba de Bancos para receber os saldos!</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* PIX Target Bank */}
                              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">⚡ Recebidos em PIX para:</label>
                                <select
                                  value={pixBankId}
                                  onChange={(e) => setPixBankId(e.target.value)}
                                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                                >
                                  {banks.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                                <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span>Lançado Líquido:</span>
                                  <span className={netPixDisplay >= 0 ? 'text-purple-600 font-mono font-black' : 'text-rose-600 font-mono font-black'}>
                                    {netPixDisplay >= 0 ? '+' : ''}{formatBRL(netPixDisplay)}
                                  </span>
                                </div>
                              </div>

                              {/* Credit Card Target Bank */}
                              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">💳 Cartão de Crédito para:</label>
                                <select
                                  value={creditCardBankId}
                                  onChange={(e) => setCreditCardBankId(e.target.value)}
                                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                                >
                                  {banks.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                                <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span>Lançado Líquido:</span>
                                  <span className={netCredDisplay >= 0 ? 'text-blue-600 font-mono font-black' : 'text-rose-600 font-mono font-black'}>
                                    {netCredDisplay >= 0 ? '+' : ''}{formatBRL(netCredDisplay)}
                                  </span>
                                </div>
                              </div>

                              {/* Debit Card Target Bank */}
                              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">💳 Cartão de Débito para:</label>
                                <select
                                  value={debitCardBankId}
                                  onChange={(e) => setDebitCardBankId(e.target.value)}
                                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                                >
                                  {banks.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                                <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span>Lançado Líquido:</span>
                                  <span className={netDebDisplay >= 0 ? 'text-indigo-600 font-mono font-black' : 'text-rose-600 font-mono font-black'}>
                                    {netDebDisplay >= 0 ? '+' : ''}{formatBRL(netDebDisplay)}
                                  </span>
                                </div>
                              </div>

                              {/* Cash Target Bank (Cofre) */}
                              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">💵 Dinheiro (Cofre) para:</label>
                                <select
                                  value={cashBankId}
                                  onChange={(e) => setCashBankId(e.target.value)}
                                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                                >
                                  {banks.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                                <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span>Lançado Líquido:</span>
                                  <span className={netCashDisplay >= 0 ? 'text-emerald-600 font-mono font-black' : 'text-rose-600 font-mono font-black'}>
                                    {netCashDisplay >= 0 ? '+' : ''}{formatBRL(netCashDisplay)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* CLOSURE NOTES */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações do Fechamento (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: Fechamento referente às vendas do turno da manhã"
                            value={closureNotes}
                            onChange={(e) => setClosureNotes(e.target.value)}
                            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200"
                          />
                        </div>

                        {/* SUMMARIZED DEPOSIT ACTION BOX */}
                        <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Líquido Consolidado</span>
                            <span className="text-2xl font-black font-mono text-emerald-400">{formatBRL(finalTotalToDeposit)}</span>
                            {closureMode === 'manual' ? (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Entradas: <strong>{formatBRL(manualTotalEntradas)}</strong> | Vales deduzidos: <strong>{formatBRL(manualTotalVales)}</strong>.
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Receitas: <strong>{openRevenues.length}</strong> | Vales deduzidos: <strong>{openExpenses.length}</strong>.
                              </p>
                            )}
                          </div>

                          <button
                            onClick={closureMode === 'manual' ? handleExecuteManualClosure : handleExecuteClosure}
                            disabled={isClosingCaixa || banks.length === 0}
                            className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                          >
                            {isClosingCaixa ? (
                              <>
                                <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                                Fechando Caixa Comercial...
                              </>
                            ) : (
                              <>
                                <LucideIcon name="CheckCircle2" size={14} />
                                Confirmar e Integrar Lançamentos
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closure History (Right column) */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <LucideIcon name="History" size={14} className="text-slate-500" />
                      Histórico de Fechamentos
                    </h4>

                    {closures.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-4 text-center">Nenhum fechamento registrado anteriormente.</p>
                    ) : (
                      <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                        {closures.map(c => (
                          <div key={c.id} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500">{c.date}</span>
                                <span className="text-[8px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase">Caixa Comercial</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteClosureClick(c.id, c.date)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-rose-100"
                                title="Excluir este fechamento"
                              >
                                <LucideIcon name="Trash2" size={12} className="stroke-[2.5]" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-slate-100 py-2">
                              <div>
                                <p className="text-slate-400">⚡ PIX Bruto:</p>
                                <p className="font-bold text-slate-700 font-mono">{formatBRL(c.totalPix)}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">💵 Dinheiro (Bruto):</p>
                                <p className="font-bold text-slate-700 font-mono">{formatBRL(c.totalCash)}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-slate-400">💳 Cartões (Taxa {c.cardDiscountRate}%):</p>
                                <p className="font-bold text-slate-700 font-mono">
                                  {formatBRL(c.totalCards)} &rarr; <span className="text-emerald-600 font-bold">{formatBRL(c.netCardsAmount)}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-slate-400 font-bold">Total Líquido:</span>
                              <span className="text-xs font-black font-mono text-slate-800">
                                {formatBRL(c.totalPix + c.netCardsAmount + c.totalCash)}
                              </span>
                            </div>

                            {c.notes && (
                              <p className="text-[9px] text-slate-500 font-medium italic bg-white p-2 rounded-xl border border-slate-100">
                                &ldquo;{c.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Backup & Data Safety (New Card) */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <LucideIcon name="Database" size={14} className="text-slate-500" />
                      Segurança dos Seus Registros (Backup)
                    </h4>
                    
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Para garantir que você <strong>nunca perca suas anotações, fechamentos e lançamentos</strong>, baixe uma cópia de segurança em formato de arquivo JSON. Você poderá restaurá-la a qualquer momento.
                    </p>

                    <div className="space-y-2.5 pt-1">
                      {/* Export Button */}
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="w-full px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                      >
                        <LucideIcon name="Download" size={13} />
                        Gerar e Baixar Backup (JSON)
                      </button>

                      {/* Import Button Wrapper */}
                      <div className="relative">
                        <label
                          htmlFor="import-backup-file"
                          className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold tracking-wide transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                        >
                          {isImporting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                              Restaurando Dados...
                            </>
                          ) : (
                            <>
                              <LucideIcon name="Upload" size={13} />
                              Importar Backup (Restaurar)
                            </>
                          )}
                        </label>
                        <input
                          id="import-backup-file"
                          type="file"
                          accept=".json"
                          onChange={handleImportBackup}
                          disabled={isImporting}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-[10px] text-slate-500 flex items-start gap-2">
                      <span className="text-emerald-500 text-xs">🛡️</span>
                      <p className="leading-tight">
                        <strong>Proteção Integrada:</strong> Seus dados também ficam salvos no servidor em nuvem (Firestore) e no navegador (localStorage).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* SUB-VIEW: ANOTAÇÕES E LEMBRETES */}
            {/* ======================================================= */}
            {activeSubTab === 'notas' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Category filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setNoteFilter('todos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        noteFilter === 'todos' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Todos ({notes.length})
                    </button>
                    <button
                      onClick={() => setNoteFilter('notas')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        noteFilter === 'notas' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Anotações ({notes.filter(n => n.type === 'nota').length})
                    </button>
                    <button
                      onClick={() => setNoteFilter('lembretes_pendentes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        noteFilter === 'lembretes_pendentes' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Lembretes Pendentes ({notes.filter(n => n.type === 'lembrete' && !n.isCompleted).length})
                    </button>
                    <button
                      onClick={() => setNoteFilter('lembretes_concluidos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        noteFilter === 'lembretes_concluidos' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Lembretes Concluídos ({notes.filter(n => n.type === 'lembrete' && n.isCompleted).length})
                    </button>
                  </div>

                  <button
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-center"
                  >
                    <LucideIcon name={isAddingNote ? 'X' : 'Plus'} size={14} />
                    {isAddingNote ? 'Cancelar' : 'Nova Nota / Lembrete'}
                  </button>
                </div>

                {/* ADD NOTE FORM COMPACT */}
                <AnimatePresence>
                  {isAddingNote && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleCreateNote} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Título da Nota</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Lembrar fornecedor, Ideia de estoque"
                              value={noteTitle}
                              onChange={(e) => setNoteTitle(e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                            <select
                              value={noteType}
                              onChange={(e) => setNoteType(e.target.value as Note['type'])}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                            >
                              <option value="nota">📝 Anotação Simples</option>
                              <option value="lembrete">🔔 Lembrete com Data Limite</option>
                            </select>
                          </div>

                          {noteType === 'lembrete' && (
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data de Vencimento</label>
                              <input
                                type="date"
                                required
                                value={noteDueDate}
                                onChange={(e) => setNoteDueDate(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conteúdo da Anotação</label>
                          <textarea
                            required
                            placeholder="Descreva detalhes..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            rows={3}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cor do Lembrete</label>
                            <div className="flex gap-2">
                              {[
                                { val: '#fef08a', name: 'Amarelo' },
                                { val: '#a7f3d0', name: 'Verde' },
                                { val: '#bfdbfe', name: 'Azul' },
                                { val: '#e9d5ff', name: 'Roxo' },
                                { val: '#fbcfe8', name: 'Rosa' }
                              ].map(c => (
                                <button
                                  key={c.val}
                                  type="button"
                                  onClick={() => setNoteColor(c.val)}
                                  className={`w-6 h-6 rounded-full border border-slate-300 cursor-pointer transition-transform ${
                                    noteColor === c.val ? 'scale-120 border-slate-900 ring-2 ring-offset-1 ring-slate-400' : ''
                                  }`}
                                  style={{ backgroundColor: c.val }}
                                  title={c.name}
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Salvar Lembrete
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* NOTES GRID (Sticky notes concept) */}
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
                    <LucideIcon name="StickyNote" size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-xs text-slate-500 font-bold">Nenhum lembrete cadastrado neste filtro.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredNotes.map(n => {
                      const overdue = n.type === 'lembrete' && !n.isCompleted && isOverdue(n.dueDate);
                      
                      return (
                        <div 
                          key={n.id} 
                          className="rounded-2xl p-5 border border-slate-200/60 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[160px] relative group"
                          style={{ backgroundColor: n.color || '#fef08a' }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs font-extrabold text-slate-900 line-clamp-1">{n.title}</h5>
                              
                              <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                {n.type === 'lembrete' && (
                                  <button
                                    onClick={() => handleToggleReminder(n)}
                                    title={n.isCompleted ? 'Reabrir lembrete' : 'Marcar como concluído'}
                                    className="p-1 rounded-md hover:bg-white/50 transition-colors cursor-pointer"
                                  >
                                    <LucideIcon name={n.isCompleted ? 'CheckSquare' : 'Square'} size={14} className="text-slate-800" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteNoteClick(n.id)}
                                  title="Remover"
                                  className="p-1 rounded-md hover:bg-white/50 hover:text-rose-600 transition-colors cursor-pointer text-slate-600"
                                >
                                  <LucideIcon name="Trash2" size={14} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-800/80 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
                              {n.content}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-950/10 flex items-center justify-between text-[10px] font-bold text-slate-700/70">
                            <span>
                              {n.type === 'nota' ? '📝 Nota Simples' : '🔔 Lembrete'}
                            </span>

                            {n.type === 'lembrete' && n.dueDate && (
                              <span className={`px-2 py-0.5 rounded-sm ${
                                n.isCompleted 
                                  ? 'bg-emerald-500/10 text-emerald-800' 
                                  : overdue 
                                  ? 'bg-rose-500/20 text-rose-800 animate-pulse' 
                                  : 'bg-amber-500/10 text-amber-800'
                              }`}>
                                {n.isCompleted ? 'Concluído' : overdue ? `⚠️ Atrasado: ${n.dueDate}` : `Vence: ${n.dueDate}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

                  {/* ======================================================= */}
                  {activeSubTab === 'pedidos' && (() => {
              const filteredOrders = orders.filter(o => orderFilter === 'todos' || o.status === orderFilter);
              const categoriesInOrders = Array.from(new Set(filteredOrders.map(o => o.category || 'Geral'))) as string[];
              
              return (
                <div className="space-y-6">
                  {/* NOTEPAD HEADER */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-slate-900 rounded-xs animate-pulse" />
                        Caderno de Compras & Pedidos
                      </h4>
                      <p className="text-xs text-slate-400">Monte suas listas por locais ou categorias e marque as compras no quadradinho ao lado.</p>
                    </div>
                  </div>

                  {/* SIMPLE PAPER NOTEPAD INPUT */}
                  <form onSubmit={handleCreateOrder} className="bg-white border-2 border-slate-900/5 rounded-2xl p-4 shadow-3xs space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">O que está faltando?</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Arroz, Café, Detergente..."
                          value={orderName}
                          onChange={(e) => setOrderName(e.target.value)}
                          className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:border-slate-900 focus:bg-white font-extrabold text-slate-800 placeholder:text-slate-400 transition-all"
                        />
                      </div>
                      <div className="w-full md:w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Local / Lista de Compra</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Supermercado, Distribuidor..."
                          value={orderCategory}
                          onChange={(e) => setOrderCategory(e.target.value)}
                          className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:border-slate-900 focus:bg-white font-extrabold text-slate-800 placeholder:text-slate-400 transition-all"
                        />
                      </div>
                      <div className="flex items-end shrink-0">
                        <button
                          type="submit"
                          className="w-full md:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0 active:scale-95"
                        >
                          <LucideIcon name="Plus" size={14} className="stroke-[3]" />
                          Adicionar
                        </button>
                      </div>
                    </div>
                    {/* Quick select category badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Sugestões de locais:</span>
                      {orderSuggestions.map((suggestion) => {
                        const isSelected = orderCategory === suggestion;
                        return (
                          <div
                            key={suggestion}
                            className={`flex items-center rounded-lg text-[11px] font-bold transition-all border ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-3xs'
                                : 'bg-slate-50 border-slate-200/50 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setOrderCategory(suggestion)}
                              className="px-2.5 py-1 flex items-center gap-1 cursor-pointer focus:outline-hidden"
                            >
                              <LucideIcon name={getCategoryIcon(suggestion) as any} size={11} />
                              {suggestion}
                            </button>
                            {orderSuggestions.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderSuggestions(prev => prev.filter(s => s !== suggestion));
                                  if (orderCategory === suggestion) {
                                    setOrderCategory(orderSuggestions.find(s => s !== suggestion) || 'Geral');
                                  }
                                  showToast(`Sugestão "${suggestion}" removida!`);
                                }}
                                className={`pr-1.5 pl-0.5 py-1 hover:text-rose-500 transition-colors cursor-pointer focus:outline-hidden ${
                                  isSelected ? 'text-slate-400 hover:text-white' : 'text-slate-400'
                                }`}
                                title="Excluir sugestão"
                              >
                                <LucideIcon name="X" size={10} className="stroke-[3]" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      
                      <button
                        type="button"
                        onClick={() => {
                          const name = window.prompt('Digite o nome do novo local ou categoria para a lista:');
                          if (name && name.trim()) {
                            const trimmed = name.trim();
                            if (orderSuggestions.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                              showToast('Esta sugestão já existe.');
                              return;
                            }
                            setOrderSuggestions(prev => [...prev, trimmed]);
                            setOrderCategory(trimmed);
                            showToast(`Sugestão "${trimmed}" adicionada!`);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1 border border-slate-300/40"
                      >
                        <LucideIcon name="Plus" size={11} className="stroke-[3]" />
                        Novo Local
                      </button>
                    </div>
                  </form>

                  {/* VISUALIZATION FILTERS */}
                  <div className="flex items-center justify-between bg-slate-100/70 border border-slate-200/50 p-2.5 rounded-xl">
                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-1.5">
                      Falta Comprar: <strong className="text-slate-800 font-black">{orders.filter(o => o.status === 'pendente').length}</strong> | Comprado: <strong className="text-emerald-700 font-black">{orders.filter(o => o.status === 'comprado').length}</strong>
                    </div>
                    
                    <div className="flex bg-slate-200/40 p-0.5 rounded-lg border border-slate-200/30">
                      {(['todos', 'pendente', 'comprado'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setOrderFilter(f)}
                          className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                            orderFilter === f 
                              ? 'bg-white text-slate-950 shadow-3xs' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Falta Comprar' : 'Comprado'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CADERNO DE NOTAS - LINED PAPER LOOK GROUPED BY CATEGORY */}
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl shadow-3xs">
                      <LucideIcon name="ClipboardList" size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-bold">Nenhum item na lista para visualizar.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {categoriesInOrders.map((catName) => {
                        const catOrders = filteredOrders.filter(o => (o.category || 'Geral') === catName);
                        
                        return (
                          <div key={catName} className="space-y-2">
                            {/* Group Title (Notepad subheader style) */}
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <LucideIcon name="Folder" size={12} className="text-slate-400" />
                                  {catName}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                                  {catOrders.length} {catOrders.length === 1 ? 'item' : 'itens'}
                                </span>
                              </div>
                              
                              {/* Square button to delete all items of this category */}
                              <button
                                type="button"
                                onClick={() => handleClearCategoryOrders(catName)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-100 flex items-center justify-center cursor-pointer"
                                title={`Limpar todos os itens de "${catName}"`}
                              >
                                <LucideIcon name="Trash2" size={12} className="stroke-[2.5]" />
                              </button>
                            </div>

                            <div className="bg-white border-2 border-slate-900/5 rounded-2xl shadow-3xs overflow-hidden relative">
                              {/* Notebook red margin line */}
                              <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-rose-200 pointer-events-none" />
                              
                              <div className="divide-y divide-slate-100">
                                {catOrders.map((o) => {
                                  const isBought = o.status === 'comprado';
                                  
                                  return (
                                    <div
                                      key={o.id}
                                      className={`py-3.5 px-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-50/40 relative ${
                                        isBought ? 'bg-slate-50/20' : ''
                                      }`}
                                    >
                                      {/* Left Checkbox + Item Name */}
                                      <div className="flex items-center gap-5 flex-1 min-w-0 z-10">
                                        {/* Checklist checkbox - square, clean notepad style */}
                                        <button
                                          onClick={() => handleToggleOrderStatus(o)}
                                          type="button"
                                          className="shrink-0 focus:outline-hidden cursor-pointer"
                                          title={isBought ? "Marcar como pendente" : "Marcar como comprado"}
                                        >
                                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                            isBought 
                                              ? 'bg-slate-900 border-slate-900 text-white shadow-3xs' 
                                              : 'border-slate-300 hover:border-slate-800 bg-white shadow-2xs'
                                          }`}>
                                            {isBought && <LucideIcon name="Check" size={13} className="stroke-[3.5]" />}
                                          </div>
                                        </button>

                                        {/* Item Name on the line */}
                                        <span className={`text-sm font-extrabold truncate select-none ${
                                          isBought 
                                            ? 'line-through text-slate-400 font-semibold' 
                                            : 'text-slate-800'
                                        }`}>
                                          {o.name}
                                        </span>
                                      </div>

                                      {/* Delete button on the right */}
                                      <div className="flex items-center shrink-0 gap-2 z-10">
                                        <button
                                          onClick={() => handleDeleteOrderClick(o.id)}
                                          type="button"
                                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Remover da lista"
                                        >
                                          <LucideIcon name="Trash2" size={15} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* VIEW: LEMBRETES DE CONTAS & RECORRENTES */}
            {activeSubTab === 'lembretes' && (
              <div className="space-y-6">
                {/* HEADER & NEW REMINDER TOGGLE */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 border border-slate-100 rounded-2xl shadow-3xs">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Contas & Boletos Recorrentes</h4>
                    <p className="text-[11px] text-slate-400">Cadastre suas despesas recorrentes (aluguel, internet, salários) e receba alertas antes do vencimento.</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAddingReminder(!isAddingReminder);
                      if (banks.length > 0) setSelectedDebitBankId(banks[0].id);
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <LucideIcon name={isAddingReminder ? 'Minus' : 'Plus'} size={14} />
                    {isAddingReminder ? 'Fechar Cadastro' : 'Cadastrar Conta Recorrente'}
                  </button>
                </div>

                {/* ADD REMINDER FORM */}
                {isAddingReminder && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreateBillReminder}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">Novo Lembrete Financeiro</h5>
                      
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 w-fit">
                        <button
                          type="button"
                          onClick={() => setReminderType('pagar')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            reminderType === 'pagar' 
                              ? 'bg-rose-600 text-white shadow-3xs' 
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          💸 A Pagar (Saída)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReminderType('receber')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            reminderType === 'receber' 
                              ? 'bg-teal-600 text-white shadow-3xs' 
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          💰 A Receber (Entrada)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Título do Lançamento / Descrição</label>
                        <input
                          type="text"
                          required
                          placeholder={reminderType === 'receber' ? "Ex: Aluguel Recebido, Mensalidade, Prestação de Serviço" : "Ex: Aluguel da Loja, Conta de Luz, Internet"}
                          value={reminderTitle}
                          onChange={(e) => setReminderTitle(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor do Lançamento (R$)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 1200,00"
                          value={reminderAmount}
                          onChange={(e) => setReminderAmount(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data de Vencimento</label>
                        <input
                          type="date"
                          required
                          value={reminderDueDate}
                          onChange={(e) => setReminderDueDate(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frequência</label>
                        <select
                          value={reminderFrequency}
                          onChange={(e) => setReminderFrequency(e.target.value as BillReminder['frequency'])}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        >
                          <option value="unico">Apenas Uma Vez (Único)</option>
                          <option value="semanal">Semanal</option>
                          <option value="quinzenal">Quinzenal (15 dias)</option>
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classificação de Fluxo</label>
                        <select
                          value={reminderFlowType}
                          onChange={(e) => {
                            const ft = e.target.value as BillReminder['flowType'];
                            setReminderFlowType(ft);
                            setReminderCategoryId('');
                          }}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        >
                          <option value="pessoal">Pessoal (CPF)</option>
                          <option value="comercio">Comercial / Negócio (CNPJ)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categoria Associada (Opcional)</label>
                        <select
                          value={reminderCategoryId}
                          onChange={(e) => setReminderCategoryId(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        >
                          <option value="">Selecione uma Categoria...</option>
                          {categories
                            .filter(c => c.flowType === reminderFlowType)
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notificar quantos dias antes?</label>
                        <select
                          value={reminderDaysBefore}
                          onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden"
                        >
                          <option value={1}>1 dia antes</option>
                          <option value={2}>2 dias antes</option>
                          <option value={3}>3 dias antes (Recomendado)</option>
                          <option value={5}>5 dias antes</option>
                          <option value={7}>1 semana antes</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Anotações Internas (Opcional)</label>
                      <textarea
                        placeholder="Ex: Adicionar observações sobre a chave PIX de pagamento ou código de barras..."
                        value={reminderNotes}
                        onChange={(e) => setReminderNotes(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden h-20 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingReminder(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                      >
                        Salvar Lembrete Financeiro
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* FILTERS BAR */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-3xs">
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                    <button
                      onClick={() => setReminderFilter('todos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reminderFilter === 'todos' ? 'bg-slate-800 text-white shadow-3xs' : 'bg-white border border-slate-200/60 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setReminderFilter('pendente')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reminderFilter === 'pendente' ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-3xs' : 'bg-white border border-slate-200/60 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Pendentes
                    </button>
                    <button
                      onClick={() => setReminderFilter('atrasado')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reminderFilter === 'atrasado' ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-3xs' : 'bg-white border border-slate-200/60 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Atrasadas 🚨
                    </button>
                    <button
                      onClick={() => setReminderFilter('pago')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reminderFilter === 'pago' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-3xs' : 'bg-white border border-slate-200/60 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Pagas
                    </button>
                  </div>

                  {/* Flow & Type Filters */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo:</span>
                      <select
                        value={reminderTypeFilter}
                        onChange={(e) => setReminderTypeFilter(e.target.value as 'todos' | 'pagar' | 'receber')}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden shadow-3xs cursor-pointer"
                      >
                        <option value="todos">Todos</option>
                        <option value="pagar">A Pagar (Saídas)</option>
                        <option value="receber">A Receber (Entradas)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Origem:</span>
                      <select
                        value={reminderFlowFilter}
                        onChange={(e) => setReminderFlowFilter(e.target.value as 'todos' | 'pessoal' | 'comercio')}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden shadow-3xs cursor-pointer"
                      >
                        <option value="todos">Todos os Fluxos</option>
                        <option value="pessoal">Pessoal (CPF)</option>
                        <option value="comercio">Comercial (CNPJ)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* REMINDERS LISTING */}
                {billReminders.filter(r => {
                  if (reminderFilter === 'pendente') {
                    if (r.status !== 'pendente') return false;
                    if (isOverdue(r.dueDate)) return false;
                  }
                  if (reminderFilter === 'pago') {
                    if (r.status !== 'pago') return false;
                  }
                  if (reminderFilter === 'atrasado') {
                    if (r.status !== 'pendente' || !isOverdue(r.dueDate)) return false;
                  }
                  if (reminderFlowFilter !== 'todos') {
                    if (r.flowType !== reminderFlowFilter) return false;
                  }
                  if (reminderTypeFilter !== 'todos') {
                    const rType = r.type || 'pagar';
                    if (rType !== reminderTypeFilter) return false;
                  }
                  return true;
                }).length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl py-12 px-6 text-center space-y-2 shadow-2xs">
                    <div className="text-slate-300 w-12 h-12 mx-auto flex items-center justify-center bg-slate-50 rounded-full">
                      <LucideIcon name="CalendarDays" size={24} />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nenhum Lembrete Encontrado</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Não encontramos lançamentos correspondentes aos filtros ativos. Cadastre um novo lembrete para começar!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {billReminders.filter(r => {
                      if (reminderFilter === 'pendente') {
                        if (r.status !== 'pendente') return false;
                        if (isOverdue(r.dueDate)) return false;
                      }
                      if (reminderFilter === 'pago') {
                        if (r.status !== 'pago') return false;
                      }
                      if (reminderFilter === 'atrasado') {
                        if (r.status !== 'pendente' || !isOverdue(r.dueDate)) return false;
                      }
                      if (reminderFlowFilter !== 'todos') {
                        if (r.flowType !== reminderFlowFilter) return false;
                      }
                      if (reminderTypeFilter !== 'todos') {
                        const rType = r.type || 'pagar';
                        if (rType !== reminderTypeFilter) return false;
                      }
                      return true;
                    }).map(reminder => {
                      const isLate = reminder.status === 'pendente' && isOverdue(reminder.dueDate);
                      const isPaid = reminder.status === 'pago';
                      const isReceivable = reminder.type === 'receber';
                      
                      let cardBorderColor = "border-slate-100";
                      let statusBadgeStyle = "bg-amber-100 text-amber-800 border-amber-200";
                      let statusText = isReceivable ? "Pendente" : "Pendente";
                      
                      if (isPaid) {
                        cardBorderColor = isReceivable ? "border-teal-100 bg-teal-50/10" : "border-emerald-100 bg-emerald-50/10";
                        statusBadgeStyle = isReceivable ? "bg-teal-100 text-teal-800 border-teal-200" : "bg-emerald-100 text-emerald-800 border-emerald-200";
                        statusText = isReceivable ? "Recebido" : "Pago";
                      } else if (isLate) {
                        cardBorderColor = "border-rose-200 bg-rose-50/10 shadow-3xs";
                        statusBadgeStyle = "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
                        statusText = "Atrasado 🚨";
                      }

                      const reminderCategory = categories.find(c => c.id === reminder.categoryId);

                      return (
                        <div
                          key={reminder.id}
                          className={`bg-white border ${cardBorderColor} rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4 relative group`}
                        >
                          {/* Card Header */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border ${
                                    reminder.flowType === 'pessoal' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                                  }`}>
                                    {reminder.flowType === 'pessoal' ? '👤 Pessoal' : '💼 Comercial'}
                                  </span>
                                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border ${
                                    isReceivable 
                                      ? 'bg-teal-50 text-teal-700 border-teal-100' 
                                      : 'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                    {isReceivable ? '📥 A Receber' : '💸 A Pagar'}
                                  </span>
                                  {reminderCategory && (
                                    <span className="px-2 py-0.5 text-[8px] font-extrabold bg-slate-100 text-slate-600 rounded-md flex items-center gap-1">
                                      <LucideIcon name={getCategoryIcon(reminderCategory.name)} size={10} />
                                      {reminderCategory.name}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-black text-slate-800 leading-tight mt-1 group-hover:text-slate-900 transition-colors">
                                  {reminder.title}
                                </h5>
                              </div>

                              <button
                                onClick={() => handleDeleteBillReminderClick(reminder.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                title="Deletar Lembrete"
                              >
                                <LucideIcon name="Trash2" size={14} />
                              </button>
                            </div>

                            <p className={`text-xl font-extrabold font-mono tracking-tight my-2.5 ${isReceivable ? 'text-teal-700' : 'text-rose-700'}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reminder.amount)}
                            </p>

                            <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-500 space-y-1 mt-2 border border-slate-100">
                              <div className="flex justify-between items-center">
                                <span>📅 Vencimento:</span>
                                <strong className="text-slate-700 font-mono">{reminder.dueDate}</strong>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>🔄 Frequência:</span>
                                <span className="font-extrabold capitalize text-slate-600">{reminder.frequency === 'unico' ? 'Único' : reminder.frequency}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>🔔 Notificar:</span>
                                <span className="font-bold text-slate-600">{reminder.reminderDaysBefore} dias antes</span>
                              </div>
                            </div>

                            {reminder.notes && (
                              <p className="text-[10px] text-slate-400 italic mt-2 line-clamp-2 leading-relaxed">
                                " {reminder.notes} "
                              </p>
                            )}
                          </div>

                          {/* Action Area & Payment Options */}
                          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                            {/* Status Row */}
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusBadgeStyle}`}>
                                {statusText}
                              </span>

                              {!isPaid && payingReminderId !== reminder.id && (
                                <button
                                  onClick={() => {
                                    setPayingReminderId(reminder.id);
                                    setRecordAsExpense(true);
                                    if (banks.length > 0) setSelectedDebitBankId(banks[0].id);
                                  }}
                                  className={`px-3 py-1.5 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-3xs ${
                                    isReceivable 
                                      ? 'bg-teal-600 hover:bg-teal-700' 
                                      : 'bg-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  <LucideIcon name="Check" size={11} className="stroke-[3]" />
                                  {isReceivable ? 'Confirmar Recebido' : 'Marcar como Pago'}
                                </button>
                              )}
                            </div>

                            {/* INLINE PAYMENT CONFIRMATION SUB-FORM */}
                            {payingReminderId === reminder.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5 text-left mt-2 shadow-3xs"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`record-tx-${reminder.id}`}
                                    checked={recordAsExpense}
                                    onChange={(e) => setRecordAsExpense(e.target.checked)}
                                    className={`rounded border-slate-300 w-3.5 h-3.5 cursor-pointer ${
                                      isReceivable ? 'text-teal-600 focus:ring-teal-500' : 'text-emerald-600 focus:ring-emerald-500'
                                    }`}
                                  />
                                  <label htmlFor={`record-tx-${reminder.id}`} className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                                    {isReceivable ? 'Registrar receita no fluxo financeiro' : 'Registrar despesa no fluxo financeiro'}
                                  </label>
                                </div>

                                {recordAsExpense && banks.length > 0 && (
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      {isReceivable ? 'Conta para crédito:' : 'Conta para débito:'}
                                    </label>
                                    <select
                                      value={selectedDebitBankId}
                                      onChange={(e) => setSelectedDebitBankId(e.target.value)}
                                      className="w-full text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden cursor-pointer"
                                    >
                                      <option value="">{isReceivable ? 'Nenhum (Apenas registrar receita)' : 'Nenhum (Apenas registrar despesa)'}</option>
                                      {banks.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.balance)})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleConfirmPayBillReminder(reminder, recordAsExpense, selectedDebitBankId).then(() => setPayingReminderId(null))}
                                    className={`flex-1 py-1 px-2.5 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer text-center shadow-3xs ${
                                      isReceivable 
                                        ? 'bg-teal-600 hover:bg-teal-700' 
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                  >
                                    {isReceivable ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
                                  </button>
                                  <button
                                    onClick={() => setPayingReminderId(null)}
                                    className="py-1 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Voltar
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

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
};
