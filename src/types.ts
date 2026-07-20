export type FlowType = 'pessoal' | 'comercio';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'outro';

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind hex or name
  icon: string; // Lucide icon name
  flowType: FlowType | 'ambas';
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'receita' | 'despesa';
  flowType: FlowType;
  categoryId: string;
  notes?: string;
  receiptName?: string;
  paymentMethod?: PaymentMethod; // Optional for backward compatibility, but we will default it
  isClosed?: boolean; // Track if it has been integrated in a cash closure
  closureId?: string; // Reference to closure operation
  createdAt: string;
}

export interface Bank {
  id: string;
  name: string;
  type: 'digital' | 'tradicional' | 'carteira' | 'outro';
  balance: number;
  color: string; // HEX code
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'nota' | 'lembrete';
  dueDate?: string; // YYYY-MM-DD
  isCompleted?: boolean;
  color?: string; // e.g. '#fef08a' (yellow) etc
  createdAt: string;
}

export interface CashClosure {
  id: string;
  date: string; // YYYY-MM-DD
  totalPix: number;
  totalCards: number;
  totalCash: number;
  cardDiscountRate: number; // e.g., 2.5 means 2.5%
  netCardsAmount: number; // card totals minus the rate
  depositedBankIdPix?: string; // Where the PIX sum was deposited
  depositedBankIdCards?: string; // Where the Card net sum was deposited
  notes?: string;
  transactionIds: string[]; // List of transactions included in this closure
  createdAt: string;
}

export interface ReceiptParseResult {
  title: string;
  amount: number;
  date: string;
  categoryName: string;
  flowType: FlowType;
  notes?: string;
  confidence: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  status: 'pendente' | 'comprado';
  priority: 'alta' | 'media' | 'baixa';
  priceEstimate?: number;
  notes?: string;
  category?: string; // e.g. "Supermercado", "Distribuidor", etc.
  createdAt: string;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  frequency: 'mensal' | 'semanal' | 'quinzenal' | 'anual' | 'unico';
  status: 'pendente' | 'pago' | 'atrasado';
  flowType: FlowType;
  type: 'pagar' | 'receber'; // pagar = contas a pagar, receber = contas a receber
  reminderDaysBefore: number; // e.g. 1, 2, 3 days
  notes?: string;
  categoryId?: string;
  createdAt: string;
}

export interface CaixinhaTransaction {
  id: string;
  type: 'deposito' | 'rendimento' | 'retirada';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface Caixinha {
  id: string;
  name: string;
  balance: number;
  totalYield: number; // accumulated earnings/yields
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  history: CaixinhaTransaction[];
}

