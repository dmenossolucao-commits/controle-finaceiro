import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { safeStorage } from './safeStorage';
import { Category, Transaction, Bank, Note, CashClosure, PaymentMethod, OrderItem, BillReminder, Caixinha, CaixinhaTransaction } from '../types';

// Default / Initial seed categories
export const SYSTEM_CATEGORIES: Category[] = [
  // --- PESSOAL ---
  {
    id: 'pessoal_alimentacao',
    name: 'Alimentação',
    color: '#10b981', // Emerald
    icon: 'Utensils',
    flowType: 'pessoal',
    isSystem: true
  },
  {
    id: 'pessoal_moradia',
    name: 'Moradia / Aluguel',
    color: '#3b82f6', // Blue
    icon: 'Home',
    flowType: 'pessoal',
    isSystem: true
  },
  {
    id: 'pessoal_transporte',
    name: 'Transporte / Combustível',
    color: '#f59e0b', // Amber
    icon: 'Car',
    flowType: 'pessoal',
    isSystem: true
  },
  {
    id: 'pessoal_saude',
    name: 'Saúde & Bem-estar',
    color: '#ef4444', // Red
    icon: 'HeartPulse',
    flowType: 'pessoal',
    isSystem: true
  },
  {
    id: 'pessoal_lazer',
    name: 'Lazer & Viagens',
    color: '#8b5cf6', // Purple
    icon: 'Sparkles',
    flowType: 'pessoal',
    isSystem: true
  },
  {
    id: 'pessoal_outros',
    name: 'Outros (Pessoal)',
    color: '#64748b', // Slate
    icon: 'HelpCircle',
    flowType: 'pessoal',
    isSystem: true
  },

  // --- COMÉRCIO ---
  {
    id: 'comercio_receita_vendas',
    name: 'Venda de Mercadorias',
    color: '#22c55e', // Green
    icon: 'ShoppingCart',
    flowType: 'comercio',
    isSystem: true
  },
  {
    id: 'comercio_compra_estoque',
    name: 'Compra de Estoque / Insumos',
    color: '#6366f1', // Indigo
    icon: 'Box',
    flowType: 'comercio',
    isSystem: true
  },
  {
    id: 'comercio_aluguel',
    name: 'Aluguel Comercial',
    color: '#06b6d4', // Cyan
    icon: 'Building',
    flowType: 'comercio',
    isSystem: true
  },
  {
    id: 'comercio_marketing',
    name: 'Marketing / Anúncios',
    color: '#ec4899', // Pink
    icon: 'Megaphone',
    flowType: 'comercio',
    isSystem: true
  },
  {
    id: 'comercio_impostos',
    name: 'Impostos / Taxas',
    color: '#f43f5e', // Rose
    icon: 'Receipt',
    flowType: 'comercio',
    isSystem: true
  },
  {
    id: 'comercio_outros',
    name: 'Outros (Comércio)',
    color: '#475569', // Dark Slate
    icon: 'HelpCircle',
    flowType: 'comercio',
    isSystem: true
  }
];

const CATEGORIES_COL = 'categories';
const TRANSACTIONS_COL = 'transactions';
const BANKS_COL = 'bancos';
const NOTES_COL = 'notas';
const CLOSURES_COL = 'fechamentos';
const ORDERS_COL = 'pedidos_compra';
const REMINDERS_COL = 'lembretes_contas';
const CAIXINHAS_COL = 'caixinhas';

const LOCAL_CATEGORIES_KEY = 'control_financeiro_local_categories';
const LOCAL_TRANSACTIONS_KEY = 'control_financeiro_local_transactions';
const LOCAL_BANKS_KEY = 'control_financeiro_local_banks';
const LOCAL_NOTES_KEY = 'control_financeiro_local_notes';
const LOCAL_CLOSURES_KEY = 'control_financeiro_local_closures';
const LOCAL_ORDERS_KEY = 'control_financeiro_local_orders';
const LOCAL_REMINDERS_KEY = 'control_financeiro_local_reminders';
const LOCAL_CAIXINHAS_KEY = 'control_financeiro_local_caixinhas';

/**
 * Fetch all categories. Seeds default categories if collection is empty.
 * Merges with local custom categories from safeStorage.
 */
export async function getCategories(): Promise<Category[]> {
  let dbCategories: Category[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORIES_COL));
    querySnapshot.forEach((doc) => {
      dbCategories.push({ id: doc.id, ...doc.data() } as Category);
    });

    if (dbCategories.length === 0) {
      console.log('Nenhuma categoria encontrada. Semeando categorias padrão...');
      try {
        const batch = writeBatch(db);
        for (const cat of SYSTEM_CATEGORIES) {
          const docRef = doc(db, CATEGORIES_COL, cat.id);
          batch.set(docRef, {
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            flowType: cat.flowType,
            isSystem: cat.isSystem
          });
        }
        await batch.commit();
      } catch (err) {
        console.warn('Falha ao semear categorias padrão no Firestore:', err);
      }
      dbCategories = [...SYSTEM_CATEGORIES];
    }
  } catch (error) {
    console.warn('Erro ao buscar categorias do Firestore, usando fallback padrão:', error);
    dbCategories = [...SYSTEM_CATEGORIES];
  }

  // Merge with custom categories in safeStorage
  try {
    const localCatsStr = safeStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (localCatsStr) {
      const localCats = JSON.parse(localCatsStr) as Category[];
      const existingIds = new Set(dbCategories.map(c => c.id));
      localCats.forEach(cat => {
        if (!existingIds.has(cat.id)) {
          dbCategories.push(cat);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar categorias locais:', e);
  }

  return dbCategories;
}

/**
 * Add a new custom category. Falls back to safeStorage if Firestore write fails.
 */
export async function addCategory(category: Omit<Category, 'id'>): Promise<Category> {
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COL), category);
    return {
      id: docRef.id,
      ...category
    };
  } catch (error) {
    console.warn('Erro ao salvar categoria no Firestore, salvando localmente:', error);
    
    // Save to safeStorage as a robust fallback
    const id = 'local_cat_' + Math.random().toString(36).substr(2, 9);
    const newCat: Category = {
      id,
      ...category
    };

    try {
      const localCatsStr = safeStorage.getItem(LOCAL_CATEGORIES_KEY);
      const localCats: Category[] = localCatsStr ? JSON.parse(localCatsStr) : [];
      localCats.push(newCat);
      safeStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(localCats));
    } catch (e) {
      console.error('Erro ao escrever categoria no safeStorage:', e);
    }

    return newCat;
  }
}

/**
 * Delete a category. Handles both Firestore and safeStorage deletions.
 */
export async function deleteCategory(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CATEGORIES_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar categoria do Firestore:', err);
  }

  try {
    const localCatsStr = safeStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (localCatsStr) {
      const localCats = JSON.parse(localCatsStr) as Category[];
      const updated = localCats.filter(c => c.id !== id);
      safeStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Erro ao remover categoria local:', e);
  }
}

/**
 * Fetch all transactions ordered by date descending.
 */
export async function getTransactions(): Promise<Transaction[]> {
  let dbTransactions: Transaction[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COL));
    querySnapshot.forEach((doc) => {
      dbTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
  } catch (error) {
    console.warn('Erro ao buscar transações do Firestore, usando fallback local:', error);
  }

  // Load local transactions from safeStorage
  try {
    const localTxsStr = safeStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (localTxsStr) {
      const localTxs = JSON.parse(localTxsStr) as Transaction[];
      const existingIds = new Set(dbTransactions.map(t => t.id));
      localTxs.forEach(tx => {
        if (!existingIds.has(tx.id)) {
          dbTransactions.push(tx);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar transações locais:', e);
  }

  // Ensure overall sorting by date desc, then by createdAt desc
  return dbTransactions.sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Add a new transaction. Falls back to safeStorage on Firestore write failure.
 */
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const createdAt = new Date().toISOString();
  const txData = {
    ...transaction,
    createdAt
  };

  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COL), txData);
    return {
      id: docRef.id,
      ...txData
    };
  } catch (error) {
    console.warn('Erro ao salvar transação no Firestore, salvando localmente:', error);

    const id = 'local_tx_' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id,
      ...txData
    };

    try {
      const localTxsStr = safeStorage.getItem(LOCAL_TRANSACTIONS_KEY);
      const localTxs: Transaction[] = localTxsStr ? JSON.parse(localTxsStr) : [];
      localTxs.unshift(newTx);
      safeStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(localTxs));
    } catch (e) {
      console.error('Erro ao escrever transação no safeStorage:', e);
    }

    return newTx;
  }
}

/**
 * Delete a transaction. Handles both Firestore and safeStorage deletions.
 */
export async function deleteTransaction(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar transação do Firestore:', err);
  }

  try {
    const localTxsStr = safeStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (localTxsStr) {
      const localTxs = JSON.parse(localTxsStr) as Transaction[];
      const updated = localTxs.filter(t => t.id !== id);
      safeStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Erro ao deletar transação local:', e);
  }
}

// ==========================================
// BANK OPERATIONS
// ==========================================
export async function getBanks(): Promise<Bank[]> {
  let dbBanks: Bank[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, BANKS_COL));
    querySnapshot.forEach((doc) => {
      dbBanks.push({ id: doc.id, ...doc.data() } as Bank);
    });
  } catch (error) {
    console.warn('Erro ao buscar bancos do Firestore, usando fallback local:', error);
  }

  // Load from safeStorage
  try {
    const localBanksStr = safeStorage.getItem(LOCAL_BANKS_KEY);
    if (localBanksStr) {
      const localBanks = JSON.parse(localBanksStr) as Bank[];
      const existingIds = new Set(dbBanks.map(b => b.id));
      localBanks.forEach(b => {
        if (!existingIds.has(b.id)) {
          dbBanks.push(b);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar bancos locais:', e);
  }

  // If we have absolutely no banks, seed some defaults
  if (dbBanks.length === 0) {
    const defaultBanks: Bank[] = [
      {
        id: 'default_cash',
        name: 'Cofre Físico (Dinheiro)',
        type: 'carteira',
        balance: 0,
        color: '#10b981',
        createdAt: new Date().toISOString()
      },
      {
        id: 'default_nubank',
        name: 'Conta Corrente / PIX',
        type: 'digital',
        balance: 0,
        color: '#8b5cf6',
        createdAt: new Date().toISOString()
      }
    ];

    // Try to seed in Firestore (ignore error)
    for (const bank of defaultBanks) {
      try {
        await setDoc(doc(db, BANKS_COL, bank.id), bank);
      } catch (err) {
        // Safe to ignore
      }
    }

    // Save in safeStorage as fallback
    try {
      safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(defaultBanks));
    } catch (e) {}

    return defaultBanks;
  }

  return dbBanks;
}

export async function addBank(bank: Omit<Bank, 'id' | 'createdAt'>): Promise<Bank> {
  const createdAt = new Date().toISOString();
  const bankData = { ...bank, createdAt };

  try {
    const docRef = await addDoc(collection(db, BANKS_COL), bankData);
    const newBank = { id: docRef.id, ...bankData };
    
    // Sync to local
    try {
      const local = safeStorage.getItem(LOCAL_BANKS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newBank);
      safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newBank;
  } catch (error) {
    console.warn('Erro ao salvar banco no Firestore, salvando localmente:', error);
    const id = 'local_bank_' + Math.random().toString(36).substr(2, 9);
    const newBank = { id, ...bankData };

    try {
      const local = safeStorage.getItem(LOCAL_BANKS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newBank);
      safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newBank;
  }
}

export async function updateBank(bankId: string, updates: Partial<Omit<Bank, 'id' | 'createdAt'>>): Promise<void> {
  try {
    await setDoc(doc(db, BANKS_COL, bankId), updates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar banco no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_BANKS_KEY);
    if (local) {
      const list = JSON.parse(local) as Bank[];
      const idx = list.findIndex(b => b.id === bankId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

export async function deleteBank(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BANKS_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar banco do Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_BANKS_KEY);
    if (local) {
      const list = JSON.parse(local) as Bank[];
      const updated = list.filter(b => b.id !== id);
      safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// ==========================================
// NOTE OPERATIONS
// ==========================================
export async function getNotes(): Promise<Note[]> {
  let dbNotes: Note[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, NOTES_COL));
    querySnapshot.forEach((doc) => {
      dbNotes.push({ id: doc.id, ...doc.data() } as Note);
    });
  } catch (error) {
    console.warn('Erro ao buscar notas do Firestore, usando fallback local:', error);
  }

  try {
    const localNotesStr = safeStorage.getItem(LOCAL_NOTES_KEY);
    if (localNotesStr) {
      const localNotes = JSON.parse(localNotesStr) as Note[];
      const existingIds = new Set(dbNotes.map(n => n.id));
      localNotes.forEach(n => {
        if (!existingIds.has(n.id)) {
          dbNotes.push(n);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar notas locais:', e);
  }

  return dbNotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  const createdAt = new Date().toISOString();
  const noteData = { ...note, createdAt };

  try {
    const docRef = await addDoc(collection(db, NOTES_COL), noteData);
    const newNote = { id: docRef.id, ...noteData };

    try {
      const local = safeStorage.getItem(LOCAL_NOTES_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newNote);
      safeStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(list));
    } catch (e) {}

    return newNote;
  } catch (error) {
    const id = 'local_note_' + Math.random().toString(36).substr(2, 9);
    const newNote = { id, ...noteData };

    try {
      const local = safeStorage.getItem(LOCAL_NOTES_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newNote);
      safeStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(list));
    } catch (e) {}

    return newNote;
  }
}

export async function updateNote(noteId: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
  try {
    await setDoc(doc(db, NOTES_COL, noteId), updates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar nota no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_NOTES_KEY);
    if (local) {
      const list = JSON.parse(local) as Note[];
      const idx = list.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        safeStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, NOTES_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar nota do Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_NOTES_KEY);
    if (local) {
      const list = JSON.parse(local) as Note[];
      const updated = list.filter(n => n.id !== id);
      safeStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// ==========================================
// CASH CLOSURE OPERATIONS
// ==========================================
export async function getClosures(): Promise<CashClosure[]> {
  let dbClosures: CashClosure[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, CLOSURES_COL));
    querySnapshot.forEach((doc) => {
      dbClosures.push({ id: doc.id, ...doc.data() } as CashClosure);
    });
  } catch (error) {
    console.warn('Erro ao buscar fechamentos do Firestore, usando fallback local:', error);
  }

  try {
    const localClosuresStr = safeStorage.getItem(LOCAL_CLOSURES_KEY);
    if (localClosuresStr) {
      const localClosures = JSON.parse(localClosuresStr) as CashClosure[];
      const existingIds = new Set(dbClosures.map(c => c.id));
      localClosures.forEach(c => {
        if (!existingIds.has(c.id)) {
          dbClosures.push(c);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar fechamentos locais:', e);
  }

  return dbClosures.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addClosure(closure: Omit<CashClosure, 'id' | 'createdAt'>): Promise<CashClosure> {
  const createdAt = new Date().toISOString();
  const closureData = { ...closure, createdAt };

  try {
    const docRef = await addDoc(collection(db, CLOSURES_COL), closureData);
    const newClosure = { id: docRef.id, ...closureData };

    try {
      const local = safeStorage.getItem(LOCAL_CLOSURES_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newClosure);
      safeStorage.setItem(LOCAL_CLOSURES_KEY, JSON.stringify(list));
    } catch (e) {}

    return newClosure;
  } catch (error) {
    const id = 'local_closure_' + Math.random().toString(36).substr(2, 9);
    const newClosure = { id, ...closureData };

    try {
      const local = safeStorage.getItem(LOCAL_CLOSURES_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newClosure);
      safeStorage.setItem(LOCAL_CLOSURES_KEY, JSON.stringify(list));
    } catch (e) {}

    return newClosure;
  }
}

export async function updateTransactionStatus(txId: string, updates: { isClosed?: boolean, closureId?: string, paymentMethod?: PaymentMethod }): Promise<void> {
  try {
    await setDoc(doc(db, TRANSACTIONS_COL, txId), updates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar transação no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (local) {
      const list = JSON.parse(local) as Transaction[];
      const idx = list.findIndex(t => t.id === txId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        safeStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

// ==========================================
// SHOPPING LIST / ORDER OPERATIONS
// ==========================================
export async function getOrderItems(): Promise<OrderItem[]> {
  let dbOrders: OrderItem[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, ORDERS_COL));
    querySnapshot.forEach((doc) => {
      dbOrders.push({ id: doc.id, ...doc.data() } as OrderItem);
    });
  } catch (error) {
    console.warn('Erro ao buscar pedidos do Firestore, usando fallback local:', error);
  }

  try {
    const localOrdersStr = safeStorage.getItem(LOCAL_ORDERS_KEY);
    if (localOrdersStr) {
      const localOrders = JSON.parse(localOrdersStr) as OrderItem[];
      const existingIds = new Set(dbOrders.map(o => o.id));
      localOrders.forEach(o => {
        if (!existingIds.has(o.id)) {
          dbOrders.push(o);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar pedidos locais:', e);
  }

  // Sort by status ('pendente' first), then by date descending
  return dbOrders.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pendente' ? -1 : 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function addOrderItem(item: Omit<OrderItem, 'id' | 'createdAt'>): Promise<OrderItem> {
  const createdAt = new Date().toISOString();
  const itemData = { ...item, createdAt };

  try {
    const docRef = await addDoc(collection(db, ORDERS_COL), itemData);
    const newOrder = { id: docRef.id, ...itemData };

    try {
      const local = safeStorage.getItem(LOCAL_ORDERS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newOrder);
      safeStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newOrder;
  } catch (error) {
    const id = 'local_order_' + Math.random().toString(36).substr(2, 9);
    const newOrder = { id, ...itemData };

    try {
      const local = safeStorage.getItem(LOCAL_ORDERS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newOrder);
      safeStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newOrder;
  }
}

export async function updateOrderItem(itemId: string, updates: Partial<Omit<OrderItem, 'id' | 'createdAt'>>): Promise<void> {
  try {
    await setDoc(doc(db, ORDERS_COL, itemId), updates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar pedido no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_ORDERS_KEY);
    if (local) {
      const list = JSON.parse(local) as OrderItem[];
      const idx = list.findIndex(o => o.id === itemId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        safeStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

export async function deleteOrderItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ORDERS_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar pedido do Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_ORDERS_KEY);
    if (local) {
      const list = JSON.parse(local) as OrderItem[];
      const updated = list.filter(o => o.id !== id);
      safeStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

export async function clearAllOrderItems(): Promise<void> {
  try {
    const items = await getOrderItems();
    for (const item of items) {
      await deleteDoc(doc(db, ORDERS_COL, item.id));
    }
  } catch (err) {
    console.warn('Erro ao limpar pedidos do Firestore:', err);
  }

  try {
    safeStorage.removeItem(LOCAL_ORDERS_KEY);
  } catch (e) {}
}

// ==========================================
// BILL REMINDERS OPERATIONS
// ==========================================
export async function getBillReminders(): Promise<BillReminder[]> {
  let dbReminders: BillReminder[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, REMINDERS_COL));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      dbReminders.push({ id: doc.id, type: 'pagar', ...data } as BillReminder);
    });
  } catch (error) {
    console.warn('Erro ao buscar lembretes do Firestore, usando fallback local:', error);
  }

  try {
    const localRemindersStr = safeStorage.getItem(LOCAL_REMINDERS_KEY);
    if (localRemindersStr) {
      const localReminders = JSON.parse(localRemindersStr) as BillReminder[];
      const existingIds = new Set(dbReminders.map(r => r.id));
      localReminders.forEach(r => {
        if (!existingIds.has(r.id)) {
          dbReminders.push({ type: 'pagar', ...r });
        }
      });
    }
  } catch (e) {}

  return dbReminders.map(r => ({
    ...r,
    type: r.type || 'pagar'
  })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function addBillReminder(reminder: Omit<BillReminder, 'id' | 'createdAt'>): Promise<BillReminder> {
  const reminderData = {
    ...reminder,
    createdAt: new Date().toISOString()
  };

  let id = Math.random().toString(36).substr(2, 9);
  try {
    const docRef = await addDoc(collection(db, REMINDERS_COL), reminderData);
    id = docRef.id;
  } catch (error) {
    console.warn('Erro ao salvar lembrete no Firestore, salvando apenas localmente:', error);
  }

  const newReminder: BillReminder = { id, ...reminderData };

  try {
    const local = safeStorage.getItem(LOCAL_REMINDERS_KEY);
    const list = local ? JSON.parse(local) as BillReminder[] : [];
    list.push(newReminder);
    safeStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(list));
  } catch (e) {}

  return newReminder;
}

export async function updateBillReminder(id: string, updates: Partial<Omit<BillReminder, 'id' | 'createdAt'>>): Promise<void> {
  try {
    await setDoc(doc(db, REMINDERS_COL, id), updates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar lembrete no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_REMINDERS_KEY);
    if (local) {
      const list = JSON.parse(local) as BillReminder[];
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        safeStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

export async function deleteBillReminder(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, REMINDERS_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar lembrete do Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_REMINDERS_KEY);
    if (local) {
      const list = JSON.parse(local) as BillReminder[];
      const updated = list.filter(r => r.id !== id);
      safeStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

export async function resetAllData(): Promise<void> {
  // 1. Delete all transactions
  try {
    const txSnapshot = await getDocs(collection(db, TRANSACTIONS_COL));
    for (const d of txSnapshot.docs) {
      await deleteDoc(doc(db, TRANSACTIONS_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar transações do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_TRANSACTIONS_KEY);

  // 2. Delete all closures
  try {
    const clsSnapshot = await getDocs(collection(db, CLOSURES_COL));
    for (const d of clsSnapshot.docs) {
      await deleteDoc(doc(db, CLOSURES_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar fechamentos do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_CLOSURES_KEY);

  // 3. Delete all notes
  try {
    const notesSnapshot = await getDocs(collection(db, NOTES_COL));
    for (const d of notesSnapshot.docs) {
      await deleteDoc(doc(db, NOTES_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar notas do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_NOTES_KEY);

  // 4. Delete all order items (pedidos)
  try {
    const ordSnapshot = await getDocs(collection(db, ORDERS_COL));
    for (const d of ordSnapshot.docs) {
      await deleteDoc(doc(db, ORDERS_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar pedidos do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_ORDERS_KEY);

  // 5. Delete all bill reminders
  try {
    const remSnapshot = await getDocs(collection(db, REMINDERS_COL));
    for (const d of remSnapshot.docs) {
      await deleteDoc(doc(db, REMINDERS_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar lembretes do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_REMINDERS_KEY);

  // 6. Delete all custom categories
  try {
    const catSnapshot = await getDocs(collection(db, CATEGORIES_COL));
    for (const d of catSnapshot.docs) {
      if (!d.id.startsWith('pessoal_') && !d.id.startsWith('comercio_')) {
        await deleteDoc(doc(db, CATEGORIES_COL, d.id));
      }
    }
  } catch (err) {
    console.warn('Erro ao deletar categorias customizadas do Firestore:', err);
  }
  safeStorage.removeItem(LOCAL_CATEGORIES_KEY);

  // 7. Reset bank balances to 0
  try {
    const bankSnapshot = await getDocs(collection(db, BANKS_COL));
    for (const d of bankSnapshot.docs) {
      await setDoc(doc(db, BANKS_COL, d.id), { balance: 0 }, { merge: true });
    }
  } catch (err) {
    console.warn('Erro ao resetar bancos do Firestore:', err);
  }
  try {
    const localBanksStr = safeStorage.getItem(LOCAL_BANKS_KEY);
    if (localBanksStr) {
      const localBanks = JSON.parse(localBanksStr) as Bank[];
      const reset = localBanks.map(b => ({ ...b, balance: 0 }));
      safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(reset));
    }
  } catch (e) {}
}

export async function deleteClosure(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CLOSURES_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar fechamento do Firestore:', err);
  }

  try {
    const localClosuresStr = safeStorage.getItem(LOCAL_CLOSURES_KEY);
    if (localClosuresStr) {
      const localClosures = JSON.parse(localClosuresStr) as CashClosure[];
      const updated = localClosures.filter(c => c.id !== id);
      safeStorage.setItem(LOCAL_CLOSURES_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Erro ao remover fechamento local:', e);
  }
}

/**
 * Exports all system data to a single unified object.
 */
export async function exportAllData(): Promise<any> {
  const categories = await getCategories();
  const transactions = await getTransactions();
  const banks = await getBanks();
  const notes = await getNotes();
  const closures = await getClosures();
  const orderItems = await getOrderItems();
  const billReminders = await getBillReminders();

  return {
    appName: 'Controle Financeiro Inteligente',
    version: '1.2',
    exportedAt: new Date().toISOString(),
    data: {
      categories,
      transactions,
      banks,
      notes,
      closures,
      orderItems,
      billReminders
    }
  };
}

/**
 * Imports all system data, completely replacing the current database and local storage.
 * Synchronizes with Firestore (if online) and safeStorage as local cache.
 */
export async function importAllData(backupObj: any): Promise<void> {
  if (!backupObj || typeof backupObj !== 'object') {
    throw new Error('Formato de backup inválido.');
  }

  const payload = backupObj.data || backupObj;
  
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
  const banks = Array.isArray(payload.banks) || Array.isArray(payload.bancos) ? (payload.banks || payload.bancos) : [];
  const notes = Array.isArray(payload.notes) || Array.isArray(payload.notas) ? (payload.notes || payload.notas) : [];
  const closures = Array.isArray(payload.closures) || Array.isArray(payload.fechamentos) ? (payload.closures || payload.fechamentos) : [];
  const orderItems = Array.isArray(payload.orderItems) || Array.isArray(payload.pedidos_compra) || Array.isArray(payload.order_items) ? (payload.orderItems || payload.pedidos_compra || payload.order_items) : [];
  const billReminders = Array.isArray(payload.billReminders) || Array.isArray(payload.lembretes_contas) || Array.isArray(payload.bill_reminders) ? (payload.billReminders || payload.lembretes_contas || payload.bill_reminders) : [];

  // --- 1. CLEAR CURRENT FIRESTORE DATABASE COLLECTIONS ---
  const collectionsToClear = [
    { name: TRANSACTIONS_COL, key: LOCAL_TRANSACTIONS_KEY },
    { name: CLOSURES_COL, key: LOCAL_CLOSURES_KEY },
    { name: NOTES_COL, key: LOCAL_NOTES_KEY },
    { name: ORDERS_COL, key: LOCAL_ORDERS_KEY },
    { name: REMINDERS_COL, key: LOCAL_REMINDERS_KEY },
    { name: BANKS_COL, key: LOCAL_BANKS_KEY },
    { name: CATEGORIES_COL, key: LOCAL_CATEGORIES_KEY }
  ];

  for (const colInfo of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colInfo.name));
      for (const d of snap.docs) {
        // Keep system categories from being explicitly deleted if possible, but we can recreate or overwrite them anyway
        await deleteDoc(doc(db, colInfo.name, d.id));
      }
    } catch (err) {
      console.warn(`Erro ao limpar coleção ${colInfo.name} no Firestore:`, err);
    }
    safeStorage.removeItem(colInfo.key);
  }

  // --- 2. WRITE IMPORTED DATA TO FIRESTORE & LOCAL STORAGE ---

  // Write Categories
  if (categories.length > 0) {
    try {
      for (const cat of categories) {
        await setDoc(doc(db, CATEGORIES_COL, cat.id), {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          flowType: cat.flowType,
          isSystem: !!cat.isSystem
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar categorias no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  }

  // Write Banks
  if (banks.length > 0) {
    try {
      for (const bank of banks) {
        await setDoc(doc(db, BANKS_COL, bank.id), {
          name: bank.name,
          color: bank.color,
          balance: parseFloat(bank.balance) || 0,
          accountType: bank.accountType || 'comercial',
          createdAt: bank.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar bancos no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(banks));
  }

  // Write Transactions
  if (transactions.length > 0) {
    try {
      for (const tx of transactions) {
        await setDoc(doc(db, TRANSACTIONS_COL, tx.id), {
          title: tx.title,
          amount: parseFloat(tx.amount) || 0,
          type: tx.type,
          paymentMethod: tx.paymentMethod || 'outro',
          categoryId: tx.categoryId,
          bankId: tx.bankId,
          date: tx.date,
          notes: tx.notes || '',
          flowType: tx.flowType || 'comercio',
          isClosureRelated: !!tx.isClosureRelated,
          isComercioPending: !!tx.isComercioPending,
          createdAt: tx.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar transações no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
  }

  // Write Notes
  if (notes.length > 0) {
    try {
      for (const note of notes) {
        await setDoc(doc(db, NOTES_COL, note.id), {
          title: note.title,
          content: note.content,
          color: note.color || '#fef08a',
          isPinned: !!note.isPinned,
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar notas no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  }

  // Write Closures
  if (closures.length > 0) {
    try {
      for (const cls of closures) {
        await setDoc(doc(db, CLOSURES_COL, cls.id), {
          date: cls.date,
          revenues: cls.revenues || {},
          outflows: cls.outflows || [],
          totalRevenue: parseFloat(cls.totalRevenue) || 0,
          totalOutflow: parseFloat(cls.totalOutflow) || 0,
          netTotal: parseFloat(cls.netTotal) || 0,
          discountAmount: parseFloat(cls.discountAmount) || 0,
          notes: cls.notes || '',
          createdAt: cls.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar fechamentos no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_CLOSURES_KEY, JSON.stringify(closures));
  }

  // Write Order Items
  if (orderItems.length > 0) {
    try {
      for (const item of orderItems) {
        await setDoc(doc(db, ORDERS_COL, item.id), {
          name: item.name,
          quantity: parseInt(item.quantity) || 1,
          estimatedPrice: parseFloat(item.estimatedPrice) || 0,
          purchased: !!item.purchased,
          category: item.category || 'estoque',
          notes: item.notes || '',
          createdAt: item.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar lista de compras no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orderItems));
  }

  // Write Bill Reminders
  if (billReminders.length > 0) {
    try {
      for (const rem of billReminders) {
        await setDoc(doc(db, REMINDERS_COL, rem.id), {
          title: rem.title,
          amount: parseFloat(rem.amount) || 0,
          dueDate: rem.dueDate,
          paid: !!rem.paid,
          category: rem.category || 'outros',
          notes: rem.notes || '',
          createdAt: rem.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Erro ao restaurar lembretes no Firestore:', err);
    }
    safeStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(billReminders));
  }
}

// ==========================================
// CAIXINHA OPERATIONS (INVESTMENTS / SAVINGS BUCKETS)
// ==========================================
export async function getCaixinhas(): Promise<Caixinha[]> {
  let dbCaixinhas: Caixinha[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, CAIXINHAS_COL));
    querySnapshot.forEach((doc) => {
      dbCaixinhas.push({ id: doc.id, ...doc.data() } as Caixinha);
    });
  } catch (error) {
    console.warn('Erro ao buscar caixinhas do Firestore, usando fallback local:', error);
  }

  // Load from safeStorage
  try {
    const localCaixinhasStr = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
    if (localCaixinhasStr) {
      const localCaixinhas = JSON.parse(localCaixinhasStr) as Caixinha[];
      const existingIds = new Set(dbCaixinhas.map(c => c.id));
      localCaixinhas.forEach(c => {
        if (!existingIds.has(c.id)) {
          dbCaixinhas.push(c);
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar caixinhas locais:', e);
  }

  return dbCaixinhas;
}

export async function addCaixinha(caixinha: Omit<Caixinha, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Promise<Caixinha> {
  const now = new Date().toISOString();
  const caixinhaData = {
    ...caixinha,
    createdAt: now,
    updatedAt: now,
    history: []
  };

  try {
    const docRef = await addDoc(collection(db, CAIXINHAS_COL), caixinhaData);
    const newCaixinha = { id: docRef.id, ...caixinhaData } as Caixinha;
    
    // Sync to local
    try {
      const local = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newCaixinha);
      safeStorage.setItem(LOCAL_CAIXINHAS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newCaixinha;
  } catch (error) {
    console.warn('Erro ao salvar caixinha no Firestore, salvando localmente:', error);
    const id = 'local_caixinha_' + Math.random().toString(36).substr(2, 9);
    const newCaixinha = { id, ...caixinhaData } as Caixinha;

    try {
      const local = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
      const list = local ? JSON.parse(local) : [];
      list.push(newCaixinha);
      safeStorage.setItem(LOCAL_CAIXINHAS_KEY, JSON.stringify(list));
    } catch (e) {}

    return newCaixinha;
  }
}

export async function updateCaixinha(caixinhaId: string, updates: Partial<Caixinha>): Promise<void> {
  const timestampUpdates = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, CAIXINHAS_COL, caixinhaId), timestampUpdates, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar caixinha no Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
    if (local) {
      const list = JSON.parse(local) as Caixinha[];
      const idx = list.findIndex(c => c.id === caixinhaId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...timestampUpdates };
        safeStorage.setItem(LOCAL_CAIXINHAS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

export async function deleteCaixinha(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CAIXINHAS_COL, id));
  } catch (err) {
    console.warn('Erro ao deletar caixinha do Firestore:', err);
  }

  try {
    const local = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
    if (local) {
      const list = JSON.parse(local) as Caixinha[];
      const updated = list.filter(c => c.id !== id);
      safeStorage.setItem(LOCAL_CAIXINHAS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

export async function addCaixinhaTransaction(
  caixinhaId: string,
  tx: Omit<CaixinhaTransaction, 'id'>
): Promise<Caixinha | null> {
  const list = await getCaixinhas();
  const caixinha = list.find(c => c.id === caixinhaId);
  if (!caixinha) return null;

  const newTx: CaixinhaTransaction = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    ...tx
  };

  const updatedHistory = [...(caixinha.history || []), newTx];
  
  // Calculate new balances
  let newBalance = caixinha.balance;
  let newYield = caixinha.totalYield;

  if (tx.type === 'deposito') {
    newBalance += tx.amount;
  } else if (tx.type === 'rendimento') {
    newBalance += tx.amount;
    newYield += tx.amount;
  } else if (tx.type === 'retirada') {
    newBalance -= tx.amount;
  }

  const updatedCaixinha: Caixinha = {
    ...caixinha,
    balance: newBalance,
    totalYield: newYield,
    history: updatedHistory,
    updatedAt: new Date().toISOString()
  };

  // Save to Firestore
  try {
    await setDoc(doc(db, CAIXINHAS_COL, caixinhaId), {
      balance: newBalance,
      totalYield: newYield,
      history: updatedHistory,
      updatedAt: updatedCaixinha.updatedAt
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar transação de caixinha no Firestore:', err);
  }

  // Save to safeStorage
  try {
    const local = safeStorage.getItem(LOCAL_CAIXINHAS_KEY);
    if (local) {
      const localList = JSON.parse(local) as Caixinha[];
      const idx = localList.findIndex(c => c.id === caixinhaId);
      if (idx !== -1) {
        localList[idx] = updatedCaixinha;
        safeStorage.setItem(LOCAL_CAIXINHAS_KEY, JSON.stringify(localList));
      }
    }
  } catch (e) {}

  return updatedCaixinha;
}

export async function resetTransactionsAndSetInitialBalance(
  amount: number,
  flowType: 'pessoal' | 'comercio' | 'ambos'
): Promise<void> {
  // 1. Fetch and delete all transactions from Firestore
  try {
    const txSnapshot = await getDocs(collection(db, TRANSACTIONS_COL));
    for (const d of txSnapshot.docs) {
      await deleteDoc(doc(db, TRANSACTIONS_COL, d.id));
    }
  } catch (err) {
    console.warn('Erro ao deletar transações do Firestore:', err);
  }
  
  // 2. Remove from local storage
  safeStorage.removeItem(LOCAL_TRANSACTIONS_KEY);

  // 3. If amount > 0, create starting balance transaction(s)
  if (amount > 0) {
    const now = new Date().toISOString().split('T')[0];
    if (flowType === 'ambos') {
      await addTransaction({
        title: 'SALDO INICIAL PESSOAL',
        amount,
        date: now,
        type: 'receita',
        flowType: 'pessoal',
        categoryId: 'pessoal_outros',
        isClosed: false,
        notes: 'Saldo inicial do período'
      });
      await addTransaction({
        title: 'SALDO INICIAL COMERCIAL',
        amount,
        date: now,
        type: 'receita',
        flowType: 'comercio',
        categoryId: 'comercio_outros',
        isClosed: false,
        notes: 'Saldo inicial do período'
      });
    } else {
      const catId = flowType === 'pessoal' ? 'pessoal_outros' : 'comercio_outros';
      await addTransaction({
        title: `SALDO INICIAL ${flowType.toUpperCase()}`,
        amount,
        date: now,
        type: 'receita',
        flowType,
        categoryId: catId,
        isClosed: false,
        notes: 'Saldo inicial do período'
      });
    }
  }
}
