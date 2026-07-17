import React from 'react';
import { PlusCircle, Search, Edit3, Trash2, FileText, User, Calendar, CreditCard, Lock, Users, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, Appointment } from '../../types';

interface PacientesTabProps {
  patients: Patient[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedPatient: Patient | null;
  setSelectedPatient: (p: Patient | null) => void;
  patientSubTab: 'evolucao' | 'historico' | 'pagamentos' | 'recibos' | 'observacoes';
  setPatientSubTab: (v: 'evolucao' | 'historico' | 'pagamentos' | 'recibos' | 'observacoes') => void;
  evolutionInput: string;
  setEvolutionInput: (v: string) => void;
  appointments: Appointment[];
  getDayString: (dateStr: string) => string;
  formatMoney: (amount: number) => string;
  handleDeletePatient: (id: string) => void;
  handleDeleteReceipt: (id: string) => void;
  setGlobalLoading: (v: boolean) => void;
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  contentService: any;
  
  // Modal states and handlers
  isPatientModalOpen: boolean;
  setIsPatientModalOpen: (v: boolean) => void;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (v: boolean) => void;
  editingPatient: Patient | null;
  setEditingPatient: (p: Patient | null) => void;
  patientForm: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    dateOfBirth: string;
    address: string;
    notes: string;
    history: string;
  };
  setPatientForm: (form: any) => void;
  receiptForm: {
    amount: string;
    description: string;
    date: string;
  };
  setReceiptForm: (form: any) => void;
  handleSavePatient: (e: React.FormEvent) => void;
  handleAddReceipt: (e: React.FormEvent) => void;
}

export default function PacientesTab({
  patients,
  searchQuery,
  setSearchQuery,
  selectedPatient,
  setSelectedPatient,
  patientSubTab,
  setPatientSubTab,
  evolutionInput,
  setEvolutionInput,
  appointments,
  getDayString,
  formatMoney,
  handleDeletePatient,
  handleDeleteReceipt,
  setGlobalLoading,
  setPatients,
  contentService,
  isPatientModalOpen,
  setIsPatientModalOpen,
  isReceiptModalOpen,
  setIsReceiptModalOpen,
  editingPatient,
  setEditingPatient,
  patientForm,
  setPatientForm,
  receiptForm,
  setReceiptForm,
  handleSavePatient,
  handleAddReceipt
}: PacientesTabProps) {
  return (
    <motion.div
      key="tab-pacientes"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left side list of patients */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">Lista de Pacientes</h3>
          <button
            onClick={() => {
              setEditingPatient(null);
              setPatientForm({ name: '', email: '', phone: '', cpf: '', dateOfBirth: '', address: '', notes: '', history: '' });
              setIsPatientModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-sand-900 hover:bg-sand-950 !text-white rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors shadow-sm"
            style={{ color: '#ffffff', backgroundColor: '#352f27' }}
          >
            <PlusCircle size={14} className="!text-white" style={{ color: '#ffffff' }} />
            <span className="!text-white" style={{ color: '#ffffff' }}>Novo Paciente</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
          <input
            type="text"
            placeholder="Pesquisar pacientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
          />
        </div>

        <div className="divide-y divide-sand-100 max-h-[450px] overflow-y-auto pr-2">
          {patients
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((pt) => (
              <div
                key={pt.id}
                onClick={() => setSelectedPatient(pt)}
                className={`py-3 px-3 rounded-xl text-left cursor-pointer transition-colors ${
                  selectedPatient?.id === pt.id ? 'bg-sage-50/50 border border-sage-200/50' : 'hover:bg-sand-50/50'
                }`}
              >
                <p className="text-xs font-bold text-sand-950">{pt.name}</p>
                <p className="text-[10px] text-sand-500 font-mono mt-0.5">{pt.phone}</p>
              </div>
            ))}
          {patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="py-8 text-center text-xs text-sand-400 font-mono uppercase">
              Nenhum paciente cadastrado.
            </div>
          )}
        </div>
      </div>

      {/* Right side detailed Profile */}
      <div className="lg:col-span-8 space-y-6">
        {selectedPatient ? (
          <div className="bg-white p-8 rounded-3xl border border-sand-200/60 shadow-sm space-y-6">
            
            {/* Name, core details */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-sand-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xl font-serif font-bold text-sand-950">{selectedPatient.name}</h3>
                </div>
                <p className="text-[10px] text-sand-500 font-mono mt-1 font-semibold uppercase tracking-widest">Prontuário Ativo • ID: {selectedPatient.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPatient(selectedPatient);
                    setPatientForm({
                      name: selectedPatient.name,
                      email: selectedPatient.email,
                      phone: selectedPatient.phone,
                      cpf: selectedPatient.cpf || '',
                      dateOfBirth: selectedPatient.dateOfBirth || '',
                      address: selectedPatient.address || '',
                      notes: selectedPatient.notes || '',
                      history: selectedPatient.history || ''
                    });
                    setIsPatientModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 size={13} />
                  <span>Editar cadastro</span>
                </button>
                <button
                  onClick={() => handleDeletePatient(selectedPatient.id)}
                  className="px-3.5 py-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>

            {/* Clinical Sub-Tabs Navigation */}
            <div className="flex flex-wrap border-b border-sand-100 gap-1.5 pb-0.5">
              {[
                { id: 'evolucao', label: 'Evolução Clínica', icon: <FileText size={14} /> },
                { id: 'historico', label: 'Histórico Clínico', icon: <User size={14} /> },
                { id: 'pagamentos', label: 'Histórico de Consultas', icon: <Calendar size={14} /> },
                { id: 'recibos', label: 'Recibos & Financeiro', icon: <CreditCard size={14} /> },
                { id: 'observacoes', label: 'Observações Privadas', icon: <Lock size={14} /> }
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setPatientSubTab(subTab.id as any)}
                  className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
                    patientSubTab === subTab.id
                      ? 'border-softblue-500 text-softblue-700 bg-softblue-50/30'
                      : 'border-transparent text-sand-600 hover:text-sand-950 hover:bg-sand-50/50'
                  }`}
                >
                  {subTab.icon}
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content Panels */}
            <div className="pt-2">
              
              {/* A. Evolução Clínica (Prontuário) */}
              {patientSubTab === 'evolucao' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-sand-900 tracking-wider font-mono">Linha do Tempo de Sessões</h4>
                    <span className="text-[10px] font-mono bg-softblue-50 text-softblue-700 border border-softblue-100 px-2.5 py-0.5 rounded font-bold uppercase">
                      Documento Protegido (CFP)
                    </span>
                  </div>

                  {/* Add evolution entry block */}
                  <div className="bg-sand-50/40 p-4 rounded-2xl border border-sand-200/70 space-y-3">
                    <span className="text-[10px] font-bold text-sand-700 uppercase font-mono block">Nova Entrada de Evolução Clínica</span>
                    <textarea
                      value={evolutionInput}
                      onChange={(e) => setEvolutionInput(e.target.value)}
                      placeholder="Descreva os pontos abordados, sintomas relatados, tarefas de casa ou observações sobre o progresso terapêutico do paciente nesta sessão..."
                      className="w-full bg-white border border-sand-200 rounded-xl p-3 text-xs focus:outline-none min-h-[80px]"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-sand-500 leading-normal">
                        Esta entrada será salva com a data de hoje ({new Date().toLocaleDateString('pt-BR')}) no histórico do paciente.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!evolutionInput.trim()) return;
                          const datePrefix = `[${new Date().toLocaleDateString('pt-BR')}]`;
                          const entry = `${datePrefix} ${evolutionInput.trim()}`;
                          const updatedHistory = selectedPatient.history 
                            ? `${entry}\n\n${selectedPatient.history}` 
                            : entry;

                          try {
                            setGlobalLoading(true);
                            await contentService.updatePatient(selectedPatient.id, { history: updatedHistory });
                            const updatedPatientObj = { ...selectedPatient, history: updatedHistory };
                            setSelectedPatient(updatedPatientObj);
                            setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatientObj : p));
                            setEvolutionInput('');
                          } catch (err) {
                            console.error("Erro ao salvar evolução:", err);
                            alert("Erro ao salvar evolução clínica. Tente novamente.");
                          } finally {
                            setGlobalLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Salvar Entrada
                      </button>
                    </div>
                  </div>

                  {/* Clinical History Display */}
                  <div className="space-y-4">
                    {selectedPatient.history ? (
                      <div className="divide-y divide-sand-100 max-h-[300px] overflow-y-auto pr-2">
                        {selectedPatient.history.split('\n\n').map((block, index) => {
                          // Parse date if blocks start with [DD/MM/YYYY]
                          const dateMatch = block.match(/^\[(\d{2}\/\d{2}\/\d{4})\]/);
                          const dateText = dateMatch ? dateMatch[1] : 'Evolução';
                          const textContent = dateMatch ? block.replace(/^\[\d{2}\/\d{2}\/\d{4}\]\s*/, '') : block;

                          return (
                            <div key={index} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-softblue-400" />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-softblue-600 bg-softblue-50 px-2 py-0.5 rounded">
                                  Sessão • {dateText}
                                </span>
                              </div>
                              <p className="text-xs text-sand-800 leading-relaxed font-mono whitespace-pre-wrap pl-4">
                                {textContent}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center border border-dashed border-sand-200 rounded-2xl text-sand-500 text-xs">
                        Nenhuma anotação de evolução clínica registrada para este paciente ainda. Use o campo acima para salvar o primeiro relato.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* B. Histórico Clínico (Personal Records) */}
              {patientSubTab === 'historico' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-sand-900 tracking-wider font-mono mb-2">Dados Cadastrais do Paciente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Nome Completo</p>
                      <p className="font-semibold text-sand-950 mt-1 text-sm">{selectedPatient.name}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Endereço Residencial</p>
                      <p className="font-semibold text-sand-950 mt-1">{selectedPatient.address || 'Não cadastrado'}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Contato de WhatsApp</p>
                      <p className="font-semibold text-sand-950 mt-1">{selectedPatient.phone}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">E-mail de Cadastro</p>
                      <p className="font-semibold text-sand-950 mt-1 truncate" title={selectedPatient.email}>{selectedPatient.email}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">CPF</p>
                      <p className="font-semibold text-sand-950 mt-1">{selectedPatient.cpf || 'Não cadastrado'}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Data de Nascimento</p>
                      <p className="font-semibold text-sand-950 mt-1">{selectedPatient.dateOfBirth || 'Não informada'}</p>
                    </div>
                    <div className="p-4 bg-sand-50/30 rounded-2xl border border-sand-100/60 sm:col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Data de Registro no Sistema</p>
                        <p className="font-semibold text-sand-950 mt-0.5">
                          {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString('pt-BR') : '--/--/----'}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase">
                        Cadastro Ativo
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* C. Histórico de Consultas */}
              {patientSubTab === 'pagamentos' && (() => {
                const patientAppts = appointments.filter(a => 
                  a.patientEmail === selectedPatient.email || 
                  a.patientPhone === selectedPatient.phone ||
                  a.patientName.toLowerCase().includes(selectedPatient.name.toLowerCase())
                );

                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-sand-900 tracking-wider font-mono">Histórico de Sessões Agendadas</h4>
                    <div className="divide-y divide-sand-100 max-h-[300px] overflow-y-auto pr-2">
                      {patientAppts.length > 0 ? (
                        patientAppts.map((appt) => (
                          <div key={appt.id} className="py-3.5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-sand-950">{appt.serviceTitle}</p>
                              <p className="text-[10px] font-mono text-sand-500 mt-1">
                                Realizado em {getDayString(appt.date)} às {appt.timeSlot}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <span className="text-xs font-bold text-sand-950 font-mono">
                                {formatMoney(appt.amount || 150)}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                                appt.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : appt.status === 'pending_payment'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-sand-100 text-sand-600 border border-sand-200'
                              }`}>
                                {appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'pending_payment' ? 'Aguardando Pix' : 'Cancelada'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-sand-500 text-xs">
                          Nenhum agendamento encontrado para os canais de contato cadastrados deste paciente.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* D. Recibos Clínicos */}
              {patientSubTab === 'recibos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-sand-900 tracking-wider font-mono">Recibos e Cobranças Clínicas</h4>
                    <button
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="px-3.5 py-1.5 bg-softblue-500 text-white hover:bg-softblue-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                      <span>Emitir Recibo</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {(selectedPatient.recibos || []).length > 0 ? (
                      (selectedPatient.recibos || []).map((recibo) => (
                        <div key={recibo.id} className="p-3.5 bg-sand-50/40 rounded-xl border border-sand-150 flex items-center justify-between text-xs gap-4 font-mono">
                          <div>
                            <p className="font-bold text-sand-900">{recibo.description}</p>
                            <p className="text-[10px] text-sand-500 mt-0.5">{getDayString(recibo.date)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-softblue-700">{formatMoney(recibo.amount)}</span>
                            <button
                              onClick={() => handleDeleteReceipt(recibo.id)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer transition-colors"
                              title="Excluir recibo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center border border-dashed border-sand-200 rounded-2xl text-sand-500 text-xs">
                        Nenhum recibo clínico emitido ainda para este paciente. Use o botão acima para gerar um recibo formal em formato PDF/Impressão.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* E. Observações Privadas */}
              {patientSubTab === 'observacoes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-sand-900 tracking-wider font-mono">Anotações Clínicas Privadas</h4>
                    <span className="text-[9px] font-mono bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                      <Lock size={10} />
                      Apenas Erica Costa
                    </span>
                  </div>

                  <p className="text-[11px] text-sand-600 leading-normal">
                    Estas observações destinam-se exclusivamente ao suporte diagnóstico pessoal do psicólogo. Elas são criptografadas em trânsito e não constam no prontuário oficial compartilhado com o paciente.
                  </p>

                  <div className="p-4 bg-amber-50/20 rounded-2xl border border-amber-100 text-xs text-sand-700 leading-relaxed font-mono min-h-[120px] whitespace-pre-wrap">
                    {selectedPatient.notes || 'Nenhuma anotação privada inserida. Você pode editar o cadastro do paciente para adicionar observações confidenciais de suporte terapêutico.'}
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="h-full bg-white p-8 rounded-3xl border border-sand-200/80 shadow-sm flex flex-col items-center justify-center text-center text-sand-500 py-16">
            <Users size={36} className="text-sand-300 mb-3" />
            <p className="text-sm font-serif font-semibold text-sand-850">Ficha Clínica do Paciente</p>
            <p className="text-xs text-sand-500 mt-1 max-w-sm">Selecione um paciente na barra lateral para abrir seu prontuário clínico completo, anotações de evolução e recibos.</p>
          </div>
        )}
      </div>

      {/* --- MODALS (Rendered inline inside AnimatePresence) --- */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-sand-200 max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-sand-100 pb-4 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-sand-950 font-mono">
                  {editingPatient ? 'Editar Ficha do Paciente' : 'Cadastrar Paciente'}
                </h3>
                <button
                  onClick={() => setIsPatientModalOpen(false)}
                  className="p-1 hover:bg-sand-100 rounded-full text-sand-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail</label>
                    <input
                      type="email"
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      placeholder="(85) 99999-9999"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">CPF</label>
                    <input
                      type="text"
                      value={patientForm.cpf}
                      onChange={(e) => setPatientForm({ ...patientForm, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data Nascimento</label>
                    <input
                      type="text"
                      value={patientForm.dateOfBirth}
                      onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Endereço Residencial</label>
                  <input
                    type="text"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Evolução Clínica / Histórico Terapêutico</label>
                  <textarea
                    rows={4}
                    value={patientForm.history}
                    onChange={(e) => setPatientForm({ ...patientForm, history: e.target.value })}
                    placeholder="Histórico clínico de evoluções das sessões..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Anotações Privadas (Opcional)</label>
                  <textarea
                    rows={2}
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                    placeholder="Observações complementares secretas..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-sand-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPatientModalOpen(false)}
                    className="px-4 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Salvar Ficha Paciente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-sand-200 max-w-sm w-full p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-sand-100 pb-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sand-950 font-mono">Gerar Recibo de Consulta</h3>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 hover:bg-sand-100 rounded-full text-sand-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddReceipt} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Valor do Recibo (R$)</label>
                  <input
                    type="number"
                    required
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    placeholder="150"
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Descrição</label>
                  <input
                    type="text"
                    value={receiptForm.description}
                    onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
                    placeholder="Ex: Consulta Psicoterapia Individual"
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data de Liquidação</label>
                  <input
                    type="date"
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-sand-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="px-3.5 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Gerar e Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
