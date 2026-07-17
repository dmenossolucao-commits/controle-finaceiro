import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, TrendingUp, Calendar, Users, Percent, CheckCircle, 
  XCircle, Clock, AlertCircle, FileText, Download, Printer, Plus, Trash2, Edit3, 
  Search, Filter, Check, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, X,
  QrCode, Copy, Upload, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialTransaction, Patient, Appointment, PixConfig } from '../../types';
import { contentService } from '../../services/contentService';
import { generatePixCode, downloadQrCode } from '../../utils/pixGenerator';

interface FinanceiroTabProps {
  patients: Patient[];
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
  siteContent: any;
}

export default function FinanceiroTab({ patients, appointments, onRefresh, siteContent }: FinanceiroTabProps) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // Manual Transaction Form Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FinancialTransaction | null>(null);
  const [formPatientId, setFormPatientId] = useState('');
  const [formCustomName, setFormCustomName] = useState('');
  const [formAmount, setFormAmount] = useState(150);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().substring(0, 10));
  const [formStatus, setFormStatus] = useState<'Pendente' | 'Pago' | 'Cancelado' | 'Reembolsado'>('Pago');
  const [formMethod, setFormMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência'>('PIX');
  const [formNotes, setFormNotes] = useState('');

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<FinancialTransaction | null>(null);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'pix'>('ledger');

  // PIX Config State
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [pixKeyType, setPixKeyType] = useState<string>('CPF');
  const [pixKey, setPixKey] = useState<string>('');
  const [pixReceiverName, setPixReceiverName] = useState<string>('');
  const [pixReceiverCity, setPixReceiverCity] = useState<string>('');
  const [pixBank, setPixBank] = useState<string>('');
  const [pixLoading, setPixLoading] = useState<boolean>(false);
  const [pixSuccessMsg, setPixSuccessMsg] = useState<string>('');
  const [pixErrorMsg, setPixErrorMsg] = useState<string>('');

  // Manual Billing generator state
  const [billPatientId, setBillPatientId] = useState<string>('');
  const [billCustomName, setBillCustomName] = useState<string>('');
  const [billAmount, setBillAmount] = useState<number>(150);
  const [billDescription, setBillDescription] = useState<string>('');
  const [generatedPixCode, setGeneratedPixCode] = useState<string>('');
  const [copiedManualPix, setCopiedManualPix] = useState<boolean>(false);

  // Reports selection
  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'patient' | 'period'>('monthly');
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportPatientId, setReportPatientId] = useState<string>('');
  const [reportStartDate, setReportStartDate] = useState<string>(new Date(new Date().setDate(1)).toISOString().substring(0, 10)); // 1st of month
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().substring(0, 10)); // Today

  // Fetch transactions from Firestore on load
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await contentService.getFinancialTransactions();
      setTransactions(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao carregar lançamentos financeiros.');
    } finally {
      setLoading(false);
    }
  };

  const loadPixConfig = async () => {
    try {
      const config = await contentService.getPixConfig();
      if (config) {
        setPixConfig(config);
        setPixKeyType(config.keyType || 'CPF');
        setPixKey(config.key || '');
        setPixReceiverName(config.receiverName || '');
        setPixReceiverCity(config.receiverCity || '');
        setPixBank(config.bank || '');
      }
    } catch (err) {
      console.error("Error loading PIX config:", err);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadPixConfig();
  }, [appointments]); // Sync when appointments refresh

  // Handle Save Pix Config
  const handleSavePixConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setPixLoading(true);
    setPixSuccessMsg('');
    setPixErrorMsg('');

    if (!pixKey || !pixReceiverName || !pixReceiverCity) {
      setPixErrorMsg('Chave PIX, Nome do Recebedor e Cidade do Recebedor são obrigatórios.');
      setPixLoading(false);
      return;
    }

    try {
      const updated = await contentService.savePixConfig({
        keyType: pixKeyType,
        key: pixKey,
        receiverName: pixReceiverName,
        receiverCity: pixReceiverCity,
        bank: pixBank
      });
      setPixConfig(updated);
      setPixSuccessMsg('Configuração PIX atualizada com sucesso!');
      setTimeout(() => setPixSuccessMsg(''), 3000);
    } catch (err: any) {
      setPixErrorMsg('Erro ao salvar configuração PIX: ' + (err.message || err));
    } finally {
      setPixLoading(false);
    }
  };

  // Handle manual billing generation
  const handleGenerateManualBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setPixErrorMsg('');
    setPixSuccessMsg('');

    if (!pixConfig) {
      setPixErrorMsg('Você precisa configurar sua chave PIX antes de gerar cobranças.');
      return;
    }

    if (!billPatientId && !billCustomName) {
      setPixErrorMsg('Por favor, selecione um paciente ou insira o nome do recebedor/paciente.');
      return;
    }

    let patientName = billCustomName;
    if (billPatientId) {
      const pt = patients.find(p => p.id === billPatientId);
      if (pt) {
        patientName = pt.nome || pt.name;
      }
    }

    const txId = "bill_" + Date.now().toString(36);

    try {
      // 1. Generate Copia e Cola Code
      const code = generatePixCode({
        key: pixConfig.key,
        name: pixConfig.receiverName,
        city: pixConfig.receiverCity,
        amount: billAmount,
        description: billDescription || `Consulta com ${pixConfig.receiverName}`,
        transactionId: txId.toUpperCase()
      });

      setGeneratedPixCode(code);

      // 2. Create Pendente Financial Transaction in Firestore
      const txData: Omit<FinancialTransaction, 'id'> = {
        patientId: billPatientId || 'avulso',
        patientName,
        amount: billAmount,
        date: new Date().toISOString().substring(0, 10),
        discount: 0,
        status: 'Pendente',
        paymentMethod: 'PIX',
        notes: `${billDescription || 'Consulta'} (Cobrança PIX Gerada ID: ${txId})`,
        createdAt: Date.now()
      };

      await contentService.createFinancialTransaction(txData);
      setPixSuccessMsg('Cobrança PIX gerada e registrada no Livro de Lançamentos!');
      await loadTransactions();
      setTimeout(() => setPixSuccessMsg(''), 4000);
    } catch (err: any) {
      setPixErrorMsg('Erro ao gerar cobrança PIX: ' + (err.message || err));
    }
  };

  // Handle Save Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!formPatientId && !formCustomName) {
      setErrorMsg('Selecione um paciente cadastrado ou insira o nome.');
      setLoading(false);
      return;
    }

    let patientName = formCustomName;
    if (formPatientId) {
      const pt = patients.find(p => p.id === formPatientId);
      if (pt) {
        patientName = pt.nome || pt.name;
      }
    }

    const txData: Omit<FinancialTransaction, 'id'> = {
      patientId: formPatientId || 'avulso',
      patientName,
      amount: formAmount,
      date: formDate,
      discount: formDiscount,
      status: formStatus,
      paymentMethod: formMethod,
      notes: formNotes,
      createdAt: selectedTx ? selectedTx.createdAt : Date.now()
    };

    try {
      if (selectedTx) {
        await contentService.updateFinancialTransaction(selectedTx.id, txData);
        setSuccessMsg('Lançamento financeiro atualizado com sucesso!');
      } else {
        await contentService.createFinancialTransaction(txData);
        setSuccessMsg('Lançamento financeiro registrado com sucesso!');
      }
      setIsTxModalOpen(false);
      await loadTransactions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar transação: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction
  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente este lançamento financeiro?')) return;
    setLoading(true);
    try {
      await contentService.deleteFinancialTransaction(id);
      setSuccessMsg('Lançamento excluído com sucesso.');
      await loadTransactions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Erro ao excluir lançamento.');
    } finally {
      setLoading(false);
    }
  };

  // Open transaction modal for edit
  const handleOpenEditTx = (tx: FinancialTransaction) => {
    setSelectedTx(tx);
    setFormPatientId(tx.patientId === 'avulso' ? '' : tx.patientId);
    setFormCustomName(tx.patientId === 'avulso' ? tx.patientName : '');
    setFormAmount(tx.amount);
    setFormDiscount(tx.discount || 0);
    setFormDate(tx.date);
    setFormStatus(tx.status);
    setFormMethod(tx.paymentMethod);
    setFormNotes(tx.notes || '');
    setErrorMsg('');
    setIsTxModalOpen(true);
  };

  // Open transaction modal for new entry
  const handleOpenNewTx = () => {
    setSelectedTx(null);
    setFormPatientId('');
    setFormCustomName('');
    setFormAmount(150);
    setFormDiscount(0);
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormStatus('Pago');
    setFormMethod('PIX');
    setFormNotes('');
    setErrorMsg('');
    setIsTxModalOpen(true);
  };

  // Open Receipt Modal
  const handleOpenReceipt = (tx: FinancialTransaction) => {
    setReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };

  // Calculate Real-time Dashboard statistics
  const getStats = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    
    // Get week start
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const startOfWeekStr = startOfWeek.toISOString().substring(0, 10);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Filter paid transactions
    const paidTxs = transactions.filter(t => t.status === 'Pago');

    // Revenue calculations
    const revenueToday = paidTxs.filter(t => t.date === todayStr).reduce((sum, t) => sum + (t.amount - (t.discount || 0)), 0);
    const revenueWeek = paidTxs.filter(t => t.date >= startOfWeekStr && t.date <= todayStr).reduce((sum, t) => sum + (t.amount - (t.discount || 0)), 0);
    const revenueMonth = paidTxs.filter(t => t.date.startsWith(currentMonthStr)).reduce((sum, t) => sum + (t.amount - (t.discount || 0)), 0);

    // Consultation counts from Appointments
    const totalConsultationsThisMonth = appointments.filter(a => a.date.startsWith(currentMonthStr));
    const consultationsRealized = totalConsultationsThisMonth.filter(a => a.status === 'confirmada' || a.status === 'confirmed').length;
    const consultationsCancelled = totalConsultationsThisMonth.filter(a => a.status === 'cancelada' || a.status === 'cancelled').length;

    // Active patients
    const activePatientsCount = patients.filter(p => p.status === 'Ativo' || !p.status).length;

    // Average Ticket
    const avgTicket = paidTxs.length > 0 
      ? paidTxs.reduce((sum, t) => sum + (t.amount - (t.discount || 0)), 0) / paidTxs.length 
      : 150;

    return {
      revenueToday,
      revenueWeek,
      revenueMonth,
      consultationsRealized,
      consultationsCancelled,
      activePatientsCount,
      avgTicket
    };
  };

  const stats = getStats();

  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = tx.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || tx.paymentMethod === filterMethod;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate Report Data dynamically
  const getReportData = () => {
    return transactions.filter(t => {
      if (reportType === 'monthly') {
        return t.date.startsWith(reportMonth);
      } else if (reportType === 'annual') {
        return t.date.startsWith(String(reportYear));
      } else if (reportType === 'patient') {
        return t.patientId === reportPatientId;
      } else {
        return t.date >= reportStartDate && t.date <= reportEndDate;
      }
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const reportDataList = getReportData();
  const reportTotalAmount = reportDataList.reduce((sum, t) => {
    if (t.status === 'Pago') {
      return sum + (t.amount - (t.discount || 0));
    }
    return sum;
  }, 0);

  // CSV Exporter
  const handleExportCSV = () => {
    if (reportDataList.length === 0) {
      alert('Nenhum dado disponível para exportação.');
      return;
    }
    
    // Headers
    const headers = ['Data', 'Paciente', 'Valor Bruto (R$)', 'Desconto (R$)', 'Valor Líquido (R$)', 'Meio de Pagamento', 'Status', 'Observações'];
    const rows = reportDataList.map(t => [
      t.date,
      t.patientName,
      t.amount.toFixed(2),
      (t.discount || 0).toFixed(2),
      (t.amount - (t.discount || 0)).toFixed(2),
      t.paymentMethod,
      t.status,
      t.notes || ''
    ]);

    // Build CSV Content (with UTF-8 BOM for Excel compatibility)
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Print Handler for Receipts and Reports
  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    
    // Apply temporary clean print container
    document.body.innerHTML = `
      <style>
        @media print {
          body { background: white; color: black; font-family: sans-serif; padding: 2cm; }
          .no-print { display: none !important; }
        }
      </style>
      <div style="width: 100%; max-width: 800px; margin: 0 auto;">
        ${printContent.innerHTML}
      </div>
    `;
    
    window.print();
    
    // Restore
    document.body.innerHTML = originalContent;
    // Fast page refresh to restore event handlers (SPA React state handles re-render easily)
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PIX Notifications */}
      {pixSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>{pixSuccessMsg}</span>
        </div>
      )}
      {pixErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-xs">
          <AlertCircle size={15} className="text-rose-600 shrink-0" />
          <span>{pixErrorMsg}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-sand-200 mb-2">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'ledger'
              ? 'border-sand-950 text-sand-950 font-bold'
              : 'border-transparent text-sand-400 hover:text-sand-600'
          }`}
        >
          <DollarSign size={14} /> Lançamentos & Relatórios
        </button>
        <button
          onClick={() => setActiveSubTab('pix')}
          className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pix'
              ? 'border-sand-950 text-sand-950 font-bold'
              : 'border-transparent text-sand-400 hover:text-sand-600'
          }`}
        >
          <QrCode size={14} /> Configuração & Cobrança PIX
        </button>
      </div>

      {activeSubTab === 'ledger' ? (
        <>
          {/* FINANCIAL INDICATORS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <DollarSign size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-sand-400">Faturamento Hoje</span>
            <h4 className="text-lg font-serif font-bold text-sand-950 mt-0.5">R$ {stats.revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>

        {/* Total Month */}
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-softblue-50 rounded-xl text-softblue-600 border border-softblue-100">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-sand-400">Faturamento do Mês</span>
            <h4 className="text-lg font-serif font-bold text-sand-950 mt-0.5">R$ {stats.revenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>

        {/* Realized Consultations */}
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-sage-50 rounded-xl text-sage-600 border border-sage-100">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-sand-400">Atendimentos no Mês</span>
            <h4 className="text-lg font-serif font-bold text-sand-950 mt-0.5">{stats.consultationsRealized} Realizados</h4>
          </div>
        </div>

        {/* Avg Ticket */}
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Percent size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-sand-400">Ticket Médio por Sessão</span>
            <h4 className="text-lg font-serif font-bold text-sand-950 mt-0.5">R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>
      </div>

      {/* CORE TRANSACTIONS LEDGER AND REPORTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Transactions Ledger List (Left/Col-7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sand-100 pb-4">
            <div>
              <h3 className="text-sm font-serif font-bold text-sand-950">Livro de Lançamentos</h3>
              <p className="text-[10px] text-sand-500 font-mono mt-0.5 uppercase tracking-wider">Histórico de Transações Financeiras</p>
            </div>
            <button
              onClick={handleOpenNewTx}
              className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start"
            >
              <Plus size={13} />
              <span>Novo Lançamento</span>
            </button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sand-400"><Search size={14} /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por paciente..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-sand-200 bg-white text-sand-700 font-mono focus:outline-none"
            >
              <option value="all">Filtro: Todos Status</option>
              <option value="Pago">🟢 Pago</option>
              <option value="Pendente">🟡 Pendente</option>
              <option value="Cancelado">🔴 Cancelado</option>
              <option value="Reembolsado">🔵 Reembolsado</option>
            </select>

            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-sand-200 bg-white text-sand-700 font-mono focus:outline-none"
            >
              <option value="all">Filtro: Meio de Pagto</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">TED/DOC</option>
            </select>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-sand-100 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredTxs.length > 0 ? (
              filteredTxs.map((tx) => {
                const isPaid = tx.status === 'Pago';
                const isPending = tx.status === 'Pendente';
                const isCancelled = tx.status === 'Cancelado';
                return (
                  <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="space-y-1">
                      <p className="font-serif font-bold text-xs text-sand-950">{tx.patientName}</p>
                      <p className="text-[10px] font-mono text-sand-400 uppercase tracking-wider font-bold">
                        {tx.date} • {tx.paymentMethod} {tx.notes ? `• "${tx.notes.substring(0, 30)}..."` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-sand-950">R$ {(tx.amount - (tx.discount || 0)).toFixed(2)}</p>
                        {tx.discount > 0 && <p className="text-[9px] font-mono text-rose-500 font-bold uppercase">Desc: R$ {tx.discount.toFixed(2)}</p>}
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isPaid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        isPending ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {tx.status}
                      </span>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenReceipt(tx)}
                          className="p-1.5 hover:bg-sand-100 text-sand-600 hover:text-sand-950 rounded border border-sand-200 transition-colors cursor-pointer"
                          title="Emitir Recibo"
                        >
                          <FileText size={12} />
                        </button>
                        <button
                          onClick={() => handleOpenEditTx(tx)}
                          className="p-1.5 hover:bg-sand-100 text-sand-600 hover:text-sand-950 rounded border border-sand-200 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded border border-rose-100 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-sand-400 font-mono text-[10px] uppercase">
                <AlertCircle className="mx-auto mb-2 text-sand-300" size={24} />
                Nenhum lançamento encontrado com os filtros selecionados.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Interactive Reports Generator (Right/Col-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-serif font-bold text-sand-950">Relatórios & Exportação</h3>
            <p className="text-[10px] text-sand-500 font-mono mt-0.5 uppercase tracking-wider">Gere planilhas e demonstrativos consolidados</p>
          </div>

          {/* Form Filter Selector */}
          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Tipo de Relatório</label>
              <select
                value={reportType}
                onChange={(e: any) => setReportType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 bg-white text-sand-800 focus:outline-none"
              >
                <option value="monthly">Relatório Mensal</option>
                <option value="annual">Relatório Anual</option>
                <option value="patient">Relatório por Paciente</option>
                <option value="period">Relatório por Período Customizado</option>
              </select>
            </div>

            {/* Dynamic fields based on report type */}
            {reportType === 'monthly' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Selecione o Mês</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                />
              </div>
            )}

            {reportType === 'annual' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Selecione o Ano</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none font-mono"
                >
                  {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'patient' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Selecione o Paciente</label>
                <select
                  value={reportPatientId}
                  onChange={(e) => setReportPatientId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                >
                  <option value="">-- Selecione o Paciente --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.nome || p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'period' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data Final</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Consolidated Summary Preview */}
          <div className="p-5 bg-sand-50/50 rounded-2xl border border-sand-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase text-sand-400">Total Pago Consolidado</span>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                {reportDataList.filter(t => t.status === 'Pago').length} lançados
              </span>
            </div>

            <div className="text-center py-2">
              <h2 className="text-2xl font-serif font-bold text-sand-950">
                R$ {reportTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-[10px] text-sand-500 font-mono uppercase tracking-wider mt-0.5">Lançamentos no período</p>
            </div>

            {/* Quick Export actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleExportCSV}
                className="py-2.5 border border-sand-250 hover:bg-sand-100/50 text-sand-800 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download size={13} />
                <span>Exportar Excel/CSV</span>
              </button>
              <button
                onClick={() => handlePrint('report-print-template')}
                className="py-2.5 bg-dusty-600 hover:bg-dusty-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={13} />
                <span>Imprimir Relatório</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* CONFIGURATION COLUMN (Left - Col-5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                <QrCode size={16} className="text-sand-700" /> Configuração PIX Profissional
              </h3>
              <p className="text-[10px] text-sand-500 font-mono mt-0.5 uppercase tracking-wider">
                Defina sua chave de recebimento padrão
              </p>
            </div>

            <form onSubmit={handleSavePixConfig} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Tipo da Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="Celular">Celular</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Chave Aleatória">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Chave PIX (Valor)</label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={pixKeyType === 'CPF' ? '000.000.000-00' : pixKeyType === 'Celular' ? '+5511999999999' : 'Chave'}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome do Recebedor (Titular)</label>
                <input
                  type="text"
                  required
                  value={pixReceiverName}
                  onChange={(e) => setPixReceiverName(e.target.value)}
                  placeholder="Nome completo sem acentos"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Cidade do Recebedor</label>
                <input
                  type="text"
                  required
                  value={pixReceiverCity}
                  onChange={(e) => setPixReceiverCity(e.target.value)}
                  placeholder="Ex: Fortaleza"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Banco / Instituição (Opcional)</label>
                <input
                  type="text"
                  value={pixBank}
                  onChange={(e) => setPixBank(e.target.value)}
                  placeholder="Ex: Itaú, Nubank, Banco do Brasil"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-sand-100">
                <button
                  type="submit"
                  disabled={pixLoading}
                  className="w-full py-2.5 bg-sand-900 hover:bg-sand-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:bg-sand-400"
                >
                  <Check size={14} />
                  <span>{pixLoading ? 'Salvando...' : 'Salvar Configuração'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* MANUAL BILLING / GENERATOR COLUMN (Right - Col-7) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-sand-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                <Plus size={16} className="text-sand-700" /> Gerar Cobrança Manual PIX
              </h3>
              <p className="text-[10px] text-sand-500 font-mono mt-0.5 uppercase tracking-wider">
                Gere e exporte um código PIX de consulta sob demanda
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Form panel */}
              <form onSubmit={handleGenerateManualBill} className="md:col-span-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Selecionar Paciente</label>
                  <select
                    value={billPatientId}
                    onChange={(e) => {
                      setBillPatientId(e.target.value);
                      if (e.target.value) setBillCustomName('');
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                  >
                    <option value="">-- Selecionar Paciente --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nome || p.name}</option>
                    ))}
                    <option value="avulso">Paciente Avulso / Não Cadastrado</option>
                  </select>
                </div>

                {(!billPatientId || billPatientId === 'avulso') && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome do Paciente</label>
                    <input
                      type="text"
                      required
                      value={billCustomName}
                      onChange={(e) => setBillCustomName(e.target.value)}
                      placeholder="Nome completo do paciente avulso"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Valor da Consulta (R$)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    placeholder="150"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Descrição / Referência</label>
                  <input
                    type="text"
                    value={billDescription}
                    onChange={(e) => setBillDescription(e.target.value)}
                    placeholder="Ex: Sessao Semanal Terça-feira"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <QrCode size={14} />
                  <span>Gerar Cobrança PIX</span>
                </button>
              </form>

              {/* QR Code and Code output */}
              <div className="md:col-span-6 flex flex-col items-center justify-center border-l border-sand-100 pl-0 md:pl-6 pt-6 md:pt-0">
                {generatedPixCode ? (
                  <div className="w-full text-center space-y-4">
                    <div className="inline-block p-3 bg-white border border-sand-200 rounded-2xl shadow-xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedPixCode)}`}
                        alt="QR Code PIX"
                        referrerPolicy="no-referrer"
                        className="w-40 h-40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sand-500 font-mono">PIX Copia e Cola</p>
                      <div className="flex gap-1.5 w-full">
                        <input
                          type="text"
                          readOnly
                          value={generatedPixCode}
                          className="bg-sand-50 text-[9px] font-mono text-sand-600 px-3 py-2 border border-sand-200 rounded-xl flex-1 select-all focus:outline-none truncate"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPixCode);
                            setCopiedManualPix(true);
                            setTimeout(() => setCopiedManualPix(false), 2000);
                          }}
                          className={`p-2.5 rounded-xl border transition-all ${
                            copiedManualPix
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-sand-50 border-sand-200 text-sand-700 hover:bg-sand-100'
                          }`}
                          title="Copiar Pix"
                        >
                          {copiedManualPix ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadQrCode(generatedPixCode, `pix_cobranca_${billAmount}.png`)}
                        className="flex-1 py-2 bg-sand-100 hover:bg-sand-200 border border-sand-200 rounded-xl text-[10px] font-bold uppercase tracking-wider text-sand-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Baixar QR Code</span>
                      </button>
                      <button
                        onClick={() => setGeneratedPixCode('')}
                        className="py-2 px-3 border border-sand-200 hover:bg-sand-50 rounded-xl text-[10px] font-bold uppercase text-sand-700 transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-sand-400 max-w-xs space-y-2">
                    <QrCode size={40} className="mx-auto text-sand-300 stroke-1" />
                    <h4 className="font-serif font-bold text-xs text-sand-800">Pronto para Gerar</h4>
                    <p className="text-[10px] leading-relaxed">
                      Preencha os dados ao lado e clique em "Gerar Cobrança PIX" para criar instantaneamente o QR Code de pagamento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN TEMPLATES FOR PRINT (NATIVE BROWSER PDF) */}
      <div id="report-print-template" className="hidden">
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontFamily: 'serif', margin: '0 0 5px 0' }}>Dra. Erica Costa - Psicologia Clínica</h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#666' }}>CRP: {siteContent?.psychologist_info?.crp || '11/12345'} • Relatório de Fechamento Financeiro</p>
          <hr />
          <h3 style={{ margin: '20px 0 10px 0' }}>Demonstrativo Consolidado ({reportType})</h3>
          <p style={{ fontSize: '14px' }}><strong>Faturamento Líquido Pago:</strong> R$ {reportTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p style={{ fontSize: '14px' }}><strong>Quantidade de Lançamentos:</strong> {reportDataList.length}</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Data</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Paciente</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Valor (R$)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Método</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportDataList.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{t.date}</td>
                  <td style={{ padding: '8px' }}>{t.patientName}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{(t.amount - (t.discount || 0)).toFixed(2)}</td>
                  <td style={{ padding: '8px' }}>{t.paymentMethod}</td>
                  <td style={{ padding: '8px' }}>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MANUAL TRANSACTION ADD/EDIT */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl border border-sand-200 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-sand-50 border-b border-sand-200 px-6 py-4 flex justify-between items-center">
                <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-sage-600" />
                  {selectedTx ? 'Editar Lançamento' : 'Novo Lançamento Manual/Avulso'}
                </h4>
                <button
                  onClick={() => setIsTxModalOpen(false)}
                  className="p-1 hover:bg-sand-150 rounded-full transition-colors cursor-pointer text-sand-500 hover:text-sand-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveTx} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Patient */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Paciente Cadastrado</label>
                  <select
                    value={formPatientId}
                    onChange={(e) => {
                      setFormPatientId(e.target.value);
                      if (e.target.value) setFormCustomName('');
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                  >
                    <option value="">-- Selecione o Paciente ou preencha abaixo --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nome || p.name}</option>
                    ))}
                  </select>
                </div>

                {!formPatientId && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome Completo (Paciente Novo/Avulso)</label>
                    <input
                      type="text"
                      value={formCustomName}
                      onChange={(e) => setFormCustomName(e.target.value)}
                      placeholder="Ex: Clara Silva Mendes"
                      required={!formPatientId}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                )}

                {/* Amount, Discount, Date */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Valor Bruto</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-sand-400 font-bold font-mono">R$</span>
                      <input
                        type="number"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(Number(e.target.value))}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Desconto</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-sand-400 font-bold font-mono">R$</span>
                      <input
                        type="number"
                        value={formDiscount}
                        onChange={(e) => setFormDiscount(Number(e.target.value))}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Status, Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none font-bold"
                    >
                      <option value="Pago">Pago</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Cancelado">Cancelado</option>
                      <option value="Reembolsado">Reembolsado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Forma de Pagto</label>
                    <select
                      value={formMethod}
                      onChange={(e: any) => setFormMethod(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Cartão">Cartão de Crédito</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Transferência">Transferência/TED</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Observações</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Descrição opcional ou informações de faturamento"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                {/* Submit */}
                <div className="pt-3 border-t border-sand-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-4 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Salvar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLINICAL RECEIPT PREVIEW MODAL */}
      <AnimatePresence>
        {isReceiptModalOpen && receiptTx && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl border border-sand-200 shadow-2xl max-w-xl w-full overflow-hidden"
            >
              {/* Receipt Body with clinical aesthetics */}
              <div id="receipt-print-area" className="p-8 space-y-6">
                
                {/* Psychologist Header */}
                <div className="flex justify-between items-start border-b border-sand-200 pb-5">
                  <div className="space-y-1">
                    <h2 className="text-lg font-serif font-bold text-sand-950">{siteContent?.psychologist_info?.name || 'Dra. Erica Costa'}</h2>
                    <p className="text-[10px] font-mono font-bold uppercase text-softblue-600">Psicologia Clínica & Psicoterapia</p>
                    <p className="text-[10px] font-mono text-sand-500">CRP: {siteContent?.psychologist_info?.crp || '11/12345'}</p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-sand-400 space-y-0.5">
                    <p>RECIBO DIGITAL Nº {receiptTx.id.substring(0, 8).toUpperCase()}</p>
                    <p>EMISSÃO: {receiptTx.date}</p>
                  </div>
                </div>

                {/* Receipt Title */}
                <div className="text-center py-2 border-b border-sand-100">
                  <h3 className="text-sm font-serif font-bold uppercase tracking-widest text-sand-900">Recibo de Honorários Clínicos</h3>
                </div>

                {/* Receipt Text Statement */}
                <div className="text-xs text-sand-800 leading-relaxed font-serif text-justify space-y-4">
                  <p>
                    Recebi do(a) paciente <strong>{receiptTx.patientName}</strong> a importância de 
                    <strong> R$ {(receiptTx.amount - (receiptTx.discount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} </strong> 
                    ({(receiptTx.amount - (receiptTx.discount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) === 'BRL 150.00' ? 'Cento e cinquenta reais' : 'Valor referente a serviços de psicoterapia'}), referente a consultas psicológicas individuais online/presenciais realizadas em <strong>{receiptTx.date}</strong>.
                  </p>
                  <p>
                    Para clareza e fins de reembolso de saúde ou declaração anual, firmo o presente recibo.
                  </p>
                </div>

                {/* Financial details table */}
                <div className="border border-sand-200 rounded-xl p-4 bg-sand-50/50 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between text-sand-500">
                    <span>Meio de Pagamento:</span>
                    <span className="font-bold text-sand-800">{receiptTx.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sand-500">
                    <span>Valor Integral:</span>
                    <span className="font-bold text-sand-800">R$ {receiptTx.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sand-500">
                    <span>Desconto Aplicado:</span>
                    <span className="font-bold text-sand-800">R$ {(receiptTx.discount || 0).toFixed(2)}</span>
                  </div>
                  <hr style={{ borderStyle: 'dashed', borderColor: '#e5e7eb', margin: '4px 0' }} />
                  <div className="flex justify-between text-xs font-bold text-sand-950">
                    <span>VALOR LÍQUIDO RECOLHIDO:</span>
                    <span>R$ {(receiptTx.amount - (receiptTx.discount || 0)).toFixed(2)}</span>
                  </div>
                </div>

                {/* Digital Signature box */}
                <div className="pt-4 border-t border-sand-150 flex flex-col items-center justify-center text-center space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={13} />
                    <span>Assinado Eletronicamente por {siteContent?.psychologist_info?.name || 'Erica Costa'}</span>
                  </div>
                  <p className="text-[8px] font-mono text-sand-400">ID ASSINATURA: SHA-256:{receiptTx.id.toUpperCase()}</p>
                </div>
              </div>

              {/* Print CTA controls footer */}
              <div className="bg-sand-50 px-6 py-4 flex justify-between items-center border-t border-sand-200">
                <p className="text-[10px] text-sand-500 font-mono leading-none">Pressione "Imprimir" para gerar o PDF.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="px-4 py-2 border border-sand-200 hover:bg-sand-100 text-sand-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => handlePrint('receipt-print-area')}
                    className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={13} />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
