import React, { useState, useEffect } from 'react';
import { LucideIcon } from './Icon';
import { 
  getCaixinhas, 
  addCaixinha, 
  updateCaixinha, 
  deleteCaixinha, 
  addCaixinhaTransaction 
} from '../lib/dbService';
import { Caixinha, CaixinhaTransaction } from '../types';

interface CaixinhasProps {
  showToast: (msg: string) => void;
}

export const Caixinhas: React.FC<CaixinhasProps> = ({ showToast }) => {
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Form State
  const [newAccountName, setNewAccountName] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Hidden Mode Password Control
  const [showHidden, setShowHidden] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'toggle-show' | null>(null);

  // Transaction Actions Modal
  const [activeCaixinha, setActiveCaixinha] = useState<Caixinha | null>(null);
  const [txType, setTxType] = useState<'deposito' | 'rendimento' | 'retirada' | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Data
  const loadCaixinhasData = async () => {
    setIsLoading(true);
    try {
      const data = await getCaixinhas();
      setCaixinhas(data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar caixinhas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaixinhasData();
  }, []);

  // Handle Create Caixinha
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      showToast('Digite um nome para a caixinha!');
      return;
    }

    const initialAmount = parseFloat(initialDeposit.replace(',', '.')) || 0;
    if (initialAmount < 0) {
      showToast('O depósito inicial não pode ser negativo.');
      return;
    }

    try {
      const created = await addCaixinha({
        name: newAccountName.trim().toUpperCase(),
        balance: 0,
        totalYield: 0,
        isHidden: false
      });

      if (initialAmount > 0) {
        await addCaixinhaTransaction(created.id, {
          type: 'deposito',
          amount: initialAmount,
          date: new Date().toISOString().split('T')[0],
          notes: 'Depósito inicial de abertura'
        });
      }

      showToast(`Caixinha "${newAccountName.toUpperCase()}" criada com sucesso!`);
      setNewAccountName('');
      setInitialDeposit('');
      setIsCreating(false);
      await loadCaixinhasData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar caixinha.');
    }
  };

  // Password Verification for Hidden Accounts
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '88486875') {
      setShowHidden(prev => !prev);
      showToast(!showHidden ? 'Acesso liberado às caixinhas ocultas!' : 'Modo de visualização oculta desativado.');
      setPasswordInput('');
      setIsPasswordModalOpen(false);
    } else {
      showToast('Senha incorreta! Tente novamente.');
    }
  };

  // Open Password Prompt
  const triggerToggleHiddenMode = () => {
    if (showHidden) {
      // Just turn off without password
      setShowHidden(false);
      showToast('Caixinhas ocultas escondidas novamente.');
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  // Toggle single account isHidden status
  const handleToggleAccountVisibility = async (caixinha: Caixinha) => {
    try {
      const updatedHiddenState = !caixinha.isHidden;
      await updateCaixinha(caixinha.id, { isHidden: updatedHiddenState });
      showToast(`Caixinha "${caixinha.name}" agora está ${updatedHiddenState ? 'oculta' : 'visível'}.`);
      await loadCaixinhasData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar visibilidade da caixinha.');
    }
  };

  // Handle transaction submission (Deposit, Yield, Withdrawal)
  const handleApplyTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixinha || !txType) return;

    const amount = parseFloat(txAmount.replace(',', '.')) || 0;
    if (amount <= 0) {
      showToast('O valor deve ser maior que zero!');
      return;
    }

    if (txType === 'retirada' && amount > activeCaixinha.balance) {
      showToast('Saldo insuficiente para esta retirada!');
      return;
    }

    try {
      await addCaixinhaTransaction(activeCaixinha.id, {
        type: txType,
        amount,
        date: txDate,
        notes: txNotes.trim() || undefined
      });

      showToast(`Operação de ${txType} de R$ ${amount.toFixed(2)} aplicada!`);
      
      // Reset Modal States
      setTxAmount('');
      setTxNotes('');
      setTxDate(new Date().toISOString().split('T')[0]);
      setActiveCaixinha(null);
      setTxType(null);
      
      await loadCaixinhasData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar transação.');
    }
  };

  // Delete account confirmation
  const handleDeleteAccountConfirm = async (caixinha: Caixinha) => {
    const confirm = window.confirm(`Deseja realmente excluir permanentemente a caixinha "${caixinha.name}" e todo o seu histórico?`);
    if (!confirm) return;

    try {
      await deleteCaixinha(caixinha.id);
      showToast(`Caixinha "${caixinha.name}" excluída.`);
      await loadCaixinhasData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir caixinha.');
    }
  };

  // Filter visible accounts
  const displayedCaixinhas = caixinhas.filter(c => showHidden || !c.isHidden);
  const hiddenCount = caixinhas.filter(c => c.isHidden).length;

  return (
    <div className="space-y-6" id="piggy-banks-container">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-500 rounded-full opacity-10 blur-3xl pointer-events-none"></div>
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <h2 className="text-xl font-black tracking-tight uppercase">Caixinhas de Depósitos</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl font-medium">
            Gerencie suas metas de poupança, investimentos e seus devidos rendimentos de forma individual. Use a opção de ocultar para manter suas reservas invisíveis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10 self-start md:self-center">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <LucideIcon name="PlusCircle" size={14} />
            Nova Caixinha
          </button>

          <button
            onClick={triggerToggleHiddenMode}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border shadow-xs ${
              showHidden 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
          >
            <LucideIcon name={showHidden ? "Eye" : "EyeOff"} size={14} />
            {showHidden ? 'Ocultar Protegidas' : `Mostrar Ocultas (${hiddenCount})`}
          </button>
        </div>
      </div>

      {/* CREATE NEW ACCOUNT COLLAPSIBLE */}
      {isCreating && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <span>➕</span> Criar Nova Conta de Caixinha
            </h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <LucideIcon name="X" size={16} />
            </button>
          </div>

          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nome da Caixinha (Ex: Reserva de Emergência, Compra Carro)</label>
              <input
                type="text"
                required
                placeholder="NOME DA CONTA"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 font-bold rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Depósito Inicial (R$)</label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="0,00"
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-slate-200 bg-slate-50 font-mono font-bold rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
                >
                  Criar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ACCOUNT CARDS LIST */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase">
          🔄 Carregando suas caixinhas...
        </div>
      ) : displayedCaixinhas.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl border border-slate-150 p-12 text-center text-slate-500 space-y-3">
          <span className="text-3xl">📦</span>
          <p className="text-xs font-black uppercase tracking-wider">Nenhuma caixinha encontrada</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {showHidden 
              ? 'Crie sua primeira caixinha de investimentos usando o botão "Nova Caixinha".' 
              : 'Nenhuma caixinha visível. Se você tem caixinhas ocultas, digite a senha usando o botão de visualização.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCaixinhas.map((caixinha) => (
            <div 
              key={caixinha.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative ${
                caixinha.isHidden ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100'
              }`}
            >
              {/* Card Badge for hidden accounts */}
              {caixinha.isHidden && (
                <span className="absolute top-3 right-3 text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  🔒 Ocultada
                </span>
              )}

              {/* Title and Balance info */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🐖</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 truncate pr-16">{caixinha.name}</h3>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Saldo Acumulado</div>
                  <div className="text-2xl font-mono font-black text-slate-900">
                    R$ {caixinha.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Rendimentos devidos */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-2">
                  <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">📈 Rendimentos Totais</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +R$ {caixinha.totalYield.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons for this card */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActiveCaixinha(caixinha);
                    setTxType('deposito');
                  }}
                  className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer text-center"
                >
                  📥 Depós.
                </button>
                <button
                  onClick={() => {
                    setActiveCaixinha(caixinha);
                    setTxType('rendimento');
                  }}
                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer text-center"
                >
                  📈 Rend.
                </button>
                <button
                  onClick={() => {
                    setActiveCaixinha(caixinha);
                    setTxType('retirada');
                  }}
                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer text-center"
                >
                  📤 Retirar
                </button>
              </div>

              {/* Advanced operations (Hide/Unhide/Delete) */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleToggleAccountVisibility(caixinha)}
                  className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <LucideIcon name={caixinha.isHidden ? "Eye" : "EyeOff"} size={10} />
                  {caixinha.isHidden ? 'Tornar Visível' : 'Ocultar Conta'}
                </button>

                <button
                  onClick={() => handleDeleteAccountConfirm(caixinha)}
                  className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  Excluir
                </button>
              </div>

              {/* Collapsible history preview */}
              <div className="pt-2 text-[10px] space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <div className="font-extrabold uppercase text-slate-400 tracking-wider pb-1 flex items-center justify-between">
                  <span>📜 Histórico Recente</span>
                  <span>{caixinha.history?.length || 0} lancs</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1.5 divide-y divide-slate-100 scrollbar-none">
                  {caixinha.history && caixinha.history.length > 0 ? (
                    caixinha.history.slice().reverse().map((h) => (
                      <div key={h.id} className="pt-1.5 first:pt-0 flex justify-between items-start">
                        <div>
                          <div className="font-bold uppercase text-[9px] text-slate-700">
                            {h.type === 'deposito' ? '📥 Depósito' : h.type === 'rendimento' ? '📈 Rendimento' : '📤 Retirada'}
                          </div>
                          {h.notes && <div className="text-slate-400 text-[8px] italic">{h.notes}</div>}
                          <div className="text-slate-400 text-[8px]">{h.date}</div>
                        </div>
                        <span className={`font-mono font-bold text-[9px] ${
                          h.type === 'retirada' ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {h.type === 'retirada' ? '-' : '+'} R$ {h.amount.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-[9px] py-1">Nenhuma movimentação.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PASSWORD PROMPT MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide">Área Restrita Requer Senha</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Digite a senha de segurança de 8 dígitos para revelar ou ocultar as contas da caixinha protegidas.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold py-2 border border-slate-200 bg-slate-50 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordInput('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION ENTRY MODAL */}
      {activeCaixinha && txType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {txType === 'deposito' ? '📥' : txType === 'rendimento' ? '📈' : '📤'}
                </span>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  {txType === 'deposito' ? 'Registrar Depósito' : txType === 'rendimento' ? 'Lançar Rendimento' : 'Registrar Retirada'}
                </h3>
              </div>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                {activeCaixinha.name}
              </span>
            </div>

            <form onSubmit={handleApplyTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 font-mono font-bold rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Data da Transação</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 font-bold rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Descrição / Notas (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Rendimento Mensal 1% / Reserva Junho"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCaixinha(null);
                    setTxType(null);
                    setTxAmount('');
                    setTxNotes('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixinhas;
