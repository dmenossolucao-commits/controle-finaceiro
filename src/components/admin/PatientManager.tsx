import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText, 
  Lock, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ArrowLeft, 
  Briefcase, 
  ShieldAlert, 
  CheckCircle, 
  Save, 
  X, 
  Loader2,
  Clock,
  HeartHandshake,
  FileSpreadsheet
} from 'lucide-react';
import { contentService } from '../../services/contentService';
import { Patient, PatientAddress } from '../../types';
import { ClinicalTimeline } from './ClinicalTimeline';
import { DocumentManager } from './documents/DocumentManager';

interface PatientManagerProps {
  onPatientsUpdated?: (updatedList: Patient[]) => void;
  onGlobalLoading?: (loading: boolean) => void;
}

const INITIAL_ADDRESS: PatientAddress = {
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: ''
};

const INITIAL_FORM = {
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  sexo: 'Feminino',
  estadoCivil: 'Solteiro(a)',
  profissao: '',
  telefone: '',
  whatsapp: '',
  email: '',
  endereco: { ...INITIAL_ADDRESS },
  convenio: 'Particular',
  contatoEmergencia: '',
  nomeResponsavel: '',
  observacoes: '',
  status: 'Ativo' as 'Ativo' | 'Inativo'
};

export const PatientManager: React.FC<PatientManagerProps> = ({
  onPatientsUpdated,
  onGlobalLoading
}) => {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [sortBy, setSortBy] = useState<'nome' | 'recente' | 'consulta'>('nome');
  
  // Selected Patient & Active Tab
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'cadastro' | 'prontuario' | 'documentos' | 'agenda' | 'financeiro' | 'historico'>('cadastro');
  
  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch Patients
  const loadPatients = async () => {
    setLoading(true);
    if (onGlobalLoading) onGlobalLoading(true);
    try {
      const data = await contentService.getPatients();
      setPatients(data);
      if (onPatientsUpdated) onPatientsUpdated(data);
    } catch (err) {
      console.error("Erro ao carregar pacientes:", err);
    } finally {
      setLoading(false);
      if (onGlobalLoading) onGlobalLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Sync selected patient details when patients list changes
  useEffect(() => {
    if (selectedPatient) {
      const current = patients.find(p => p.id === selectedPatient.id);
      if (current) {
        setSelectedPatient(current);
      }
    }
  }, [patients]);

  // CEP Lookup
  const handleCepBlur = async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            rua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    } finally {
      setCepLoading(false);
    }
  };

  // Create or Update Patient
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErrorMessage("O nome do paciente é obrigatório.");
      return;
    }

    const isValidCPF = (cpfStr: string): boolean => {
      const cleanCpf = cpfStr.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
      
      let sum = 0;
      let remainder;
      
      for (let i = 1; i <= 9; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
      
      sum = 0;
      for (let i = 1; i <= 10; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
      
      return true;
    };

    const formatCPF = (cpfStr: string): string => {
      const clean = cpfStr.replace(/\D/g, '');
      if (clean.length !== 11) return cpfStr;
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
    };

    if (form.cpf && form.cpf.trim() !== '') {
      if (!isValidCPF(form.cpf)) {
        setErrorMessage("O CPF informado é inválido. Por favor, digite um CPF válido ou deixe o campo vazio.");
        return;
      }
    }

    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setErrorMessage("O e-mail informado é inválido. Por favor, digite um e-mail válido ou deixe o campo vazio.");
        return;
      }
    }

    if (form.telefone && form.telefone.trim() !== '') {
      const digits = form.telefone.replace(/\D/g, '');
      if (digits.length < 8) {
        setErrorMessage("O telefone informado é muito curto. Por favor, digite um telefone válido (mínimo de 8 dígitos) ou deixe o campo vazio.");
        return;
      }
    }

    setFormLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const clean = form.cpf?.replace(/\D/g, '') || '';
      const formattedCpf = clean.length === 11 ? formatCPF(form.cpf) : (form.cpf || '');

      const flatAddressStr = `${form.endereco.rua || ''}, ${form.endereco.numero || ''}${form.endereco.complemento ? ` (${form.endereco.complemento})` : ''} - ${form.endereco.bairro || ''}, ${form.endereco.cidade || ''}/${form.endereco.estado || ''}`;
      
      // Map properties to meet Portuguese DB requirements AND English legacy fields for dashboard compatibility
      const payload: Omit<Patient, 'id'> = {
        // Legacy compatibility keys
        name: form.nome,
        email: form.email || '',
        phone: form.telefone || '',
        cpf: formattedCpf,
        dateOfBirth: form.dataNascimento || '',
        address: flatAddressStr,
        notes: form.observacoes || '',
        createdAt: isEditing && selectedPatient ? selectedPatient.createdAt : Date.now(),
        recibos: isEditing && selectedPatient ? (selectedPatient.recibos || []) : [],
        history: isEditing && selectedPatient ? (selectedPatient.history || '') : '',

        // Portuguese specific fields
        nome: form.nome,
        rg: form.rg || '',
        dataNascimento: form.dataNascimento || '',
        sexo: form.sexo || 'Feminino',
        estadoCivil: form.estadoCivil || 'Solteiro(a)',
        profissao: form.profissao || '',
        telefone: form.telefone || '',
        whatsapp: form.whatsapp || form.telefone || '',
        endereco: { ...form.endereco },
        convenio: form.convenio || 'Particular',
        contatoEmergencia: form.contatoEmergencia || '',
        nomeResponsavel: form.nomeResponsavel || '',
        observacoes: form.observacoes || '',
        updatedAt: Date.now(),
        status: form.status || 'Ativo',
        photoUrl: form.photoUrl || ''
      };

      if (isEditing && selectedPatient) {
        // Update
        await contentService.updatePatient(selectedPatient.id, payload);
        setSuccessMessage("Cadastro atualizado com sucesso!");
        setIsEditing(false);
      } else {
        // Create
        await contentService.createPatient(payload);
        setSuccessMessage("Paciente cadastrado com sucesso!");
        setIsFormOpen(false);
      }

      await loadPatients();
      
      // Reset success banner after 3s
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erro ao salvar cadastro: " + (err.message || err));
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Patient
  const handleDeletePatient = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover permanentemente este paciente e todo o seu histórico clínico? Esta ação é irreversível.")) {
      return;
    }

    if (onGlobalLoading) onGlobalLoading(true);
    try {
      await contentService.deletePatient(id);
      setSelectedPatient(null);
      await loadPatients();
    } catch (err) {
      console.error("Erro ao deletar paciente:", err);
      alert("Erro ao excluir paciente.");
    } finally {
      if (onGlobalLoading) onGlobalLoading(false);
    }
  };

  // Open Edit Form
  const startEditing = (pt: Patient) => {
    const addr = typeof pt.endereco === 'object' && pt.endereco !== null
      ? pt.endereco as PatientAddress
      : { ...INITIAL_ADDRESS };

    setForm({
      nome: pt.nome || pt.name || '',
      cpf: pt.cpf || '',
      rg: pt.rg || '',
      dataNascimento: pt.dataNascimento || pt.dateOfBirth || '',
      sexo: pt.sexo || 'Feminino',
      estadoCivil: pt.estadoCivil || 'Solteiro(a)',
      profissao: pt.profissao || '',
      telefone: pt.telefone || pt.phone || '',
      whatsapp: pt.whatsapp || pt.phone || '',
      email: pt.email || '',
      endereco: { ...INITIAL_ADDRESS, ...addr },
      convenio: pt.convenio || 'Particular',
      contatoEmergencia: pt.contatoEmergencia || '',
      nomeResponsavel: pt.nomeResponsavel || '',
      observacoes: pt.observacoes || pt.notes || '',
      status: pt.status || 'Ativo'
    });
    
    setIsEditing(true);
    setActiveTab('cadastro');
  };

  // Open Create Form
  const startCreation = () => {
    setForm({ ...INITIAL_FORM, endereco: { ...INITIAL_ADDRESS } });
    setSelectedPatient(null);
    setIsEditing(false);
    setIsFormOpen(true);
    setErrorMessage('');
  };

  // Search & Filter & Sort Processing
  const filteredPatients = patients
    .filter(p => {
      const matchSearch = 
        (p.nome || p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.cpf || '').includes(searchQuery) ||
        (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.telefone || p.phone || '').includes(searchQuery);
      
      const pStatus = p.status || 'Ativo';
      const matchStatus = statusFilter === 'Todos' || pStatus === statusFilter;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'nome') {
        const nameA = (a.nome || a.name || '').toLowerCase();
        const nameB = (b.nome || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'recente') {
        return b.createdAt - a.createdAt;
      } else {
        // Default/Fallback sorting
        return b.createdAt - a.createdAt;
      }
    });

  // Calculate stats
  const activeCount = patients.filter(p => (p.status || 'Ativo') === 'Ativo').length;
  const inactiveCount = patients.filter(p => (p.status || 'Ativo') === 'Inativo').length;

  return (
    <div id="patient-management-module" className="space-y-6">
      
      {/* Dynamic Alerts Banner */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-semibold"
        >
          <CheckCircle className="text-emerald-600 shrink-0" size={16} />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-rose-50 text-rose-800 border border-rose-200 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-semibold"
        >
          <ShieldAlert className="text-rose-600 shrink-0" size={16} />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* Module Title & Always-Visible Action Header for Admins */}
      {!isFormOpen && (
        <div id="patient-management-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-sand-200/60 shadow-sm">
          <div>
            <h1 className="text-lg font-serif font-bold text-sand-950">Pacientes & Prontuários</h1>
            <p className="text-xs text-sand-500">Gerencie fichas clínicas, evoluções e prontuários completos dos pacientes.</p>
          </div>
          <button
            onClick={startCreation}
            className="px-4 py-2 bg-sand-900 hover:bg-sand-950 !text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto sm:ml-0 transition-colors shrink-0"
            style={{ color: '#ffffff', backgroundColor: '#352f27' }}
          >
            <PlusCircle size={14} className="!text-white" style={{ color: '#ffffff' }} />
            <span className="!text-white" style={{ color: '#ffffff' }}>Novo Paciente</span>
          </button>
        </div>
      )}

      {/* Main Container Switching between List/Add-Form and Individual Page */}
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: Patient Details (Individual View) */}
        {selectedPatient && !isFormOpen && (
          <motion.div
            key="patient-individual-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Nav Header */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setSelectedPatient(null);
                  setIsEditing(false);
                }}
                className="flex items-center gap-2 text-xs font-bold text-sand-700 hover:text-sand-950 transition-colors bg-white px-4 py-2 rounded-xl border border-sand-200 shadow-sm cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Voltar para Lista</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => startEditing(selectedPatient)}
                  className="px-4 py-2 bg-white border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors text-sand-800 shadow-sm"
                >
                  <Edit3 size={13} />
                  <span>Editar Cadastro</span>
                </button>
                <button
                  onClick={() => handleDeletePatient(selectedPatient.id)}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Trash2 size={13} />
                  <span>Excluir Ficha</span>
                </button>
              </div>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sand-200/60 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-sand-100 flex items-center justify-center text-sand-700 font-bold text-xl uppercase shrink-0 border border-sand-200/50">
                  {selectedPatient.nome ? selectedPatient.nome.substring(0, 2) : selectedPatient.name.substring(0, 2)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-sand-950">{selectedPatient.nome || selectedPatient.name}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      (selectedPatient.status || 'Ativo') === 'Ativo' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-sand-150 text-sand-600 border border-sand-200'
                    }`}>
                      {selectedPatient.status || 'Ativo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-sand-500 font-mono mt-1 font-semibold uppercase tracking-widest leading-none">
                    Prontuário Ativo • ID: {selectedPatient.id.substring(0, 8).toUpperCase()}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sand-600 mt-2">
                    <span className="flex items-center gap-1"><Phone size={12} className="text-sand-400" /> {selectedPatient.telefone || selectedPatient.phone}</span>
                    <span className="flex items-center gap-1"><Mail size={12} className="text-sand-400" /> {selectedPatient.email}</span>
                  </div>
                </div>
              </div>

              {/* Quick Details Box */}
              <div className="flex gap-4 p-4 bg-sand-50/50 rounded-2xl border border-sand-100 text-xs text-sand-700 min-w-[200px] w-full md:w-auto">
                <div className="space-y-1 w-full text-left">
                  <div className="flex justify-between gap-4">
                    <span className="text-sand-500">Cadastro em:</span>
                    <span className="font-semibold font-mono">{new Date(selectedPatient.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sand-500">Convênio:</span>
                    <span className="font-semibold">{selectedPatient.convenio || 'Particular'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sand-500">Nascimento:</span>
                    <span className="font-semibold font-mono">{selectedPatient.dataNascimento || selectedPatient.dateOfBirth || '--/--/----'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Sub-Tabs Navigation */}
            <div className="flex overflow-x-auto border-b border-sand-100 gap-2 pb-0.5 scrollbar-thin">
              {[
                { id: 'cadastro', label: 'Dados Cadastrais', icon: <User size={14} /> },
                { id: 'prontuario', label: 'Prontuário', icon: <FileText size={14} /> },
                { id: 'documentos', label: 'Documentos', icon: <FileSpreadsheet size={14} /> },
                { id: 'agenda', label: 'Agenda', icon: <Calendar size={14} /> },
                { id: 'financeiro', label: 'Financeiro', icon: <CreditCard size={14} /> },
                { id: 'historico', label: 'Histórico', icon: <Clock size={14} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsEditing(false); // Stop inline editing if user switches tabs
                  }}
                  className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'border-softblue-500 text-softblue-700 bg-softblue-50/30 font-bold'
                      : 'border-transparent text-sand-600 hover:text-sand-950 hover:bg-sand-50/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tabs Content */}
            <div className="pt-2">
              
              {/* Tab 1: Dados Cadastrais */}
              {activeTab === 'cadastro' && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sand-200/60 shadow-sm space-y-6">
                  
                  {/* Toggle inline editing or read-only structured views */}
                  {!isEditing ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-sand-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">Ficha Cadastral Completa</h3>
                        <button 
                          onClick={() => startEditing(selectedPatient)}
                          className="text-xs font-bold text-softblue-600 hover:text-softblue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Editar Informações</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Box: Dados Pessoais */}
                        <div className="space-y-4 md:col-span-2">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">Dados Pessoais</span>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-sand-500">Nome Completo</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.nome || selectedPatient.name}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">CPF</p>
                              <p className="font-bold text-sand-900 mt-1 font-mono">{selectedPatient.cpf || 'Não cadastrado'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">RG</p>
                              <p className="font-bold text-sand-900 mt-1 font-mono">{selectedPatient.rg || 'Não cadastrado'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">Data de Nascimento</p>
                              <p className="font-bold text-sand-900 mt-1 font-mono">{selectedPatient.dataNascimento || selectedPatient.dateOfBirth || '--/--/----'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">Sexo</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.sexo || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">Estado Civil</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.estadoCivil || 'Não informado'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sand-500">Profissão</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.profissao || 'Não informado'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Box: Contato */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">Contato</span>
                          <div className="space-y-3 text-xs">
                            <div>
                              <p className="text-sand-500">Telefone Principal</p>
                              <p className="font-bold text-sand-900 mt-1 font-mono">{selectedPatient.telefone || selectedPatient.phone}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">WhatsApp</p>
                              <p className="font-bold text-sand-900 mt-1 font-mono">{selectedPatient.whatsapp || selectedPatient.phone || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">E-mail</p>
                              <p className="font-bold text-sand-900 mt-1 truncate" title={selectedPatient.email}>{selectedPatient.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Box: Endereço */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">Endereço</span>
                          {typeof selectedPatient.endereco === 'object' && selectedPatient.endereco !== null ? (
                            <div className="space-y-3 text-xs">
                              <div>
                                <p className="text-sand-500">Rua e Número</p>
                                <p className="font-bold text-sand-900 mt-1">
                                  {(selectedPatient.endereco as PatientAddress).rua}, {(selectedPatient.endereco as PatientAddress).numero}
                                  {(selectedPatient.endereco as PatientAddress).complemento ? ` - ${(selectedPatient.endereco as PatientAddress).complemento}` : ''}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sand-500">Bairro</p>
                                  <p className="font-bold text-sand-900 mt-0.5">{(selectedPatient.endereco as PatientAddress).bairro}</p>
                                </div>
                                <div>
                                  <p className="text-sand-500">CEP</p>
                                  <p className="font-bold text-sand-900 mt-0.5 font-mono">{(selectedPatient.endereco as PatientAddress).cep}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sand-500">Cidade / Estado</p>
                                <p className="font-bold text-sand-900 mt-1">{(selectedPatient.endereco as PatientAddress).cidade} - {(selectedPatient.endereco as PatientAddress).estado}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <p className="text-sand-500 font-semibold">Endereço Completo</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.address || 'Não cadastrado'}</p>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Box: Informações Clínicas & Observações */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-sand-100">
                        <div className="space-y-4">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">Informações Clínicas</span>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-sand-500">Convênio</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.convenio || 'Particular'}</p>
                            </div>
                            <div>
                              <p className="text-sand-500">Contato de Emergência</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.contatoEmergencia || 'Não informado'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sand-500">Nome do Responsável Legal</p>
                              <p className="font-bold text-sand-900 mt-1">{selectedPatient.nomeResponsavel || 'Não aplicável (Paciente Maior)'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">Observações Gerais / Clínicas</span>
                          <div className="bg-sand-50/50 p-4 rounded-2xl border border-sand-100/50 min-h-[80px] text-xs text-sand-700 leading-relaxed whitespace-pre-wrap">
                            {selectedPatient.observacoes || selectedPatient.notes || 'Nenhuma observação clínica adicional inserida.'}
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    
                    // Inline Edit Form Mode
                    <form onSubmit={handleSavePatient} className="space-y-6 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-sand-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">Editar Ficha Cadastral</h3>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1 bg-white border border-sand-200 hover:bg-sand-100 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit"
                            disabled={formLoading}
                            className="px-3 py-1 bg-sand-900 hover:bg-sand-950 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {formLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            <span>Salvar Ficha</span>
                          </button>
                        </div>
                      </div>

                      {/* Core inputs identical to the registration form */}
                      <div className="space-y-6">
                        
                        {/* Seção 1: Dados Pessoais */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">1. Dados Pessoais</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Nome Completo *</span>
                              <input
                                type="text"
                                required
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">CPF</span>
                              <input
                                type="text"
                                value={form.cpf}
                                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">RG</span>
                              <input
                                type="text"
                                value={form.rg}
                                onChange={(e) => setForm({ ...form, rg: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Data de Nascimento</span>
                              <input
                                type="date"
                                value={form.dataNascimento}
                                onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Sexo</span>
                              <select
                                value={form.sexo}
                                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              >
                                <option value="Feminino">Feminino</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Não-Binário">Não-Binário</option>
                                <option value="Prefiro não dizer">Prefiro não dizer</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Estado Civil</span>
                              <select
                                value={form.estadoCivil}
                                onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              >
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viúvo(a)">Viúvo(a)</option>
                                <option value="União Estável">União Estável</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Profissão</span>
                              <input
                                type="text"
                                value={form.profissao}
                                onChange={(e) => setForm({ ...form, profissao: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção 2: Contato */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">2. Informações de Contato</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Telefone Principal</span>
                              <input
                                type="tel"
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                placeholder="(00) 00000-0000"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">WhatsApp</span>
                              <input
                                type="tel"
                                value={form.whatsapp}
                                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                placeholder="(00) 00000-0000"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">E-mail</span>
                              <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="exemplo@email.com"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção 3: Endereço */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">3. Endereço</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">CEP</span>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={form.endereco.cep}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setForm({ ...form, endereco: { ...form.endereco, cep: val } });
                                    if (val.replace(/\D/g, '').length === 8) {
                                      handleCepBlur(val);
                                    }
                                  }}
                                  onBlur={(e) => handleCepBlur(e.target.value)}
                                  placeholder="00000-000"
                                  className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                                />
                                {cepLoading && <Loader2 className="absolute right-3 top-3 animate-spin text-sand-400" size={14} />}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Rua</span>
                              <input
                                type="text"
                                value={form.endereco.rua}
                                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, rua: e.target.value } })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Número</span>
                              <input
                                type="text"
                                value={form.endereco.numero}
                                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Complemento</span>
                              <input
                                type="text"
                                value={form.endereco.complemento}
                                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })}
                                placeholder="Apto, Sala, Bloco..."
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Bairro</span>
                              <input
                                type="text"
                                value={form.endereco.bairro}
                                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:col-span-1">
                              <div>
                                <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Cidade</span>
                                <input
                                  type="text"
                                  value={form.endereco.cidade}
                                  onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })}
                                  className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Estado</span>
                                <input
                                  type="text"
                                  value={form.endereco.estado}
                                  onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, estado: e.target.value } })}
                                  placeholder="UF"
                                  maxLength={2}
                                  className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Seção 4: Informações Clínicas */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">4. Informações Clínicas & Status</span>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Convênio</span>
                              <input
                                type="text"
                                value={form.convenio}
                                onChange={(e) => setForm({ ...form, convenio: e.target.value })}
                                placeholder="Particular, SulAmérica, Bradesco..."
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Contato de Emergência</span>
                              <input
                                type="text"
                                value={form.contatoEmergencia}
                                onChange={(e) => setForm({ ...form, contatoEmergencia: e.target.value })}
                                placeholder="Nome / Telefone / Parentesco"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Status do Paciente</span>
                              <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              >
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                              </select>
                            </div>
                            <div className="sm:col-span-4">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Nome do Responsável Legal</span>
                              <input
                                type="text"
                                value={form.nomeResponsavel}
                                onChange={(e) => setForm({ ...form, nomeResponsavel: e.target.value })}
                                placeholder="Obrigatório para menores de 18 anos"
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Observações Gerais</span>
                              <textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                placeholder="Histórico resumido, queixas principais, restrições ou outras considerações..."
                                className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs min-h-[70px]"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    </form>
                  )}

                </div>
              )}

              {/* Tab 2: Prontuário */}
              {activeTab === 'prontuario' && selectedPatient && (
                <ClinicalTimeline patient={selectedPatient} />
              )}

              {/* Tab 3: Documentos */}
              {activeTab === 'documentos' && selectedPatient && (
                <DocumentManager patient={selectedPatient} />
              )}

              {/* Tab 4: Agenda */}
              {activeTab === 'agenda' && (
                <div className="bg-white p-8 rounded-3xl border border-sand-200/60 shadow-sm text-center py-16 space-y-4 max-w-xl mx-auto">
                  <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-sand-900 font-serif">Agenda Clínica do Paciente</h3>
                  <p className="text-xs text-sand-500 leading-relaxed font-mono uppercase text-[10px]">
                    Em Desenvolvimento
                  </p>
                  <p className="text-xs text-sand-600 leading-relaxed">
                    Aqui você visualizará o histórico de consultas, agendamentos futuros confirmados e faltas justificadas desse paciente específico.
                  </p>
                </div>
              )}

              {/* Tab 5: Financeiro */}
              {activeTab === 'financeiro' && (
                <div className="bg-white p-8 rounded-3xl border border-sand-200/60 shadow-sm text-center py-16 space-y-4 max-w-xl mx-auto">
                  <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-sand-900 font-serif">Extrato Financeiro & Faturamento</h3>
                  <p className="text-xs text-sand-500 leading-relaxed font-mono uppercase text-[10px]">
                    Em Desenvolvimento
                  </p>
                  <p className="text-xs text-sand-600 leading-relaxed">
                    Módulo de faturamento em preparação. Permitirá controlar sessões pagas, emitir recibos rápidos de reembolso de convênio e gerar faturas Pix ou Cartão.
                  </p>
                </div>
              )}

              {/* Tab 6: Histórico */}
              {activeTab === 'historico' && (
                <div className="bg-white p-8 rounded-3xl border border-sand-200/60 shadow-sm text-center py-16 space-y-4 max-w-xl mx-auto">
                  <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100">
                    <Clock size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-sand-900 font-serif">Histórico do Tratamento</h3>
                  <p className="text-xs text-sand-500 leading-relaxed font-mono uppercase text-[10px]">
                    Em Desenvolvimento
                  </p>
                  <p className="text-xs text-sand-600 leading-relaxed">
                    Em breve você poderá visualizar uma linha do tempo unificada das interações, alterações cadastrais, sessões efetuadas e uploads de arquivos.
                  </p>
                </div>
              )}

            </div>

          </motion.div>
        )}

        {/* VIEW 2: Patient Creation Form (Fullscreen Card) */}
        {isFormOpen && !selectedPatient && (
          <motion.div
            key="patient-creation-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-sand-200/60 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-sand-100 pb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-sand-950">Cadastrar Novo Paciente</h2>
                <p className="text-[10px] text-sand-500 font-mono uppercase tracking-wider mt-0.5">Preencha a ficha clínica inicial do paciente</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-sand-100 text-sand-600 rounded-xl cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-6 text-xs">
              
              <div className="space-y-6">
                
                {/* Seção 1: Dados Pessoais */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">1. Dados Pessoais</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Nome Completo *</span>
                      <input
                        type="text"
                        required
                        placeholder="Nome completo do paciente"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">CPF</span>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">RG</span>
                      <input
                        type="text"
                        placeholder="RG do paciente (opcional)"
                        value={form.rg}
                        onChange={(e) => setForm({ ...form, rg: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Data de Nascimento</span>
                      <input
                        type="date"
                        value={form.dataNascimento}
                        onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Sexo</span>
                      <select
                        value={form.sexo}
                        onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      >
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Não-Binário">Não-Binário</option>
                        <option value="Prefiro não dizer">Prefiro não dizer</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Estado Civil</span>
                      <select
                        value={form.estadoCivil}
                        onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Profissão</span>
                      <input
                        type="text"
                        placeholder="Profissão ou ocupação principal"
                        value={form.profissao}
                        onChange={(e) => setForm({ ...form, profissao: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Contato */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">2. Contato</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Telefone Principal</span>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">WhatsApp</span>
                      <input
                        type="tel"
                        placeholder="WhatsApp (se diferente)"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">E-mail</span>
                      <input
                        type="email"
                        placeholder="exemplo@email.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Endereço */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">3. Endereço</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">CEP</span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={form.endereco.cep}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm({ ...form, endereco: { ...form.endereco, cep: val } });
                            if (val.replace(/\D/g, '').length === 8) {
                              handleCepBlur(val);
                            }
                          }}
                          onBlur={(e) => handleCepBlur(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono"
                        />
                        {cepLoading && <Loader2 className="absolute right-3 top-3 animate-spin text-sand-400" size={14} />}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Rua</span>
                      <input
                        type="text"
                        placeholder="Logradouro / Avenida..."
                        value={form.endereco.rua}
                        onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, rua: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Número</span>
                      <input
                        type="text"
                        placeholder="Nº"
                        value={form.endereco.numero}
                        onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Complemento</span>
                      <input
                        type="text"
                        placeholder="Apto, Bloco, Fundos..."
                        value={form.endereco.complemento}
                        onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Bairro</span>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={form.endereco.bairro}
                        onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:col-span-1">
                      <div>
                        <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Cidade</span>
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={form.endereco.cidade}
                          onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Estado</span>
                        <input
                          type="text"
                          placeholder="UF"
                          value={form.endereco.estado}
                          onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, estado: e.target.value } })}
                          maxLength={2}
                          className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 4: Informações Clínicas */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-softblue-600 tracking-wider block">4. Informações Clínicas</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Convênio</span>
                      <input
                        type="text"
                        placeholder="Particular, SulAmérica..."
                        value={form.convenio}
                        onChange={(e) => setForm({ ...form, convenio: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Contato de Emergência</span>
                      <input
                        type="text"
                        placeholder="Nome, Telefone, Parentesco"
                        value={form.contatoEmergencia}
                        onChange={(e) => setForm({ ...form, contatoEmergencia: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Status Inicial</span>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Nome do Responsável Legal</span>
                      <input
                        type="text"
                        placeholder="Necessário para menores de idade"
                        value={form.nomeResponsavel}
                        onChange={(e) => setForm({ ...form, nomeResponsavel: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Observações Clínicas Gerais</span>
                      <textarea
                        placeholder="Queixa principal, diagnóstico, observações gerais sobre as sessões ou tratamento..."
                        value={form.observacoes}
                        onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-sand-150 pt-5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 bg-white border border-sand-200 rounded-xl hover:bg-sand-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-sand-900 text-white hover:bg-sand-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {formLoading ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
                  <span>Salvar Cadastro</span>
                </button>
              </div>

            </form>
          </motion.div>
        )}

        {/* VIEW 3: Patients List (Main View) */}
        {!selectedPatient && !isFormOpen && (
          <motion.div
            key="patients-list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 bg-softblue-50 text-softblue-700 border border-softblue-100 rounded-xl flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Total de Pacientes</h4>
                  <p className="text-xl font-bold text-sand-900 mt-1 font-mono leading-none">{patients.length}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex items-center justify-center font-bold">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Pacientes Ativos</h4>
                  <p className="text-xl font-bold text-sand-900 mt-1 font-mono leading-none">{activeCount}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 bg-sand-100 text-sand-600 border border-sand-200 rounded-xl flex items-center justify-center font-bold">
                  <Users size={20} className="opacity-60" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">Pacientes Inativos</h4>
                  <p className="text-xl font-bold text-sand-900 mt-1 font-mono leading-none">{inactiveCount}</p>
                </div>
              </div>
            </div>

            {/* Filters and Header Bar */}
            <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Search input */}
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none bg-white shadow-sm"
                />
              </div>

              {/* Filters and sorting */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Status filter buttons */}
                <div className="flex border border-sand-200 rounded-xl p-0.5 bg-sand-50 shadow-sm">
                  {(['Todos', 'Ativo', 'Inativo'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        statusFilter === filter
                          ? 'bg-white text-sand-950 shadow-sm font-bold'
                          : 'text-sand-600 hover:text-sand-900'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-sand-200 rounded-xl text-xs font-semibold focus:outline-none text-sand-800 shadow-sm"
                >
                  <option value="nome">Ordenar por Nome (A-Z)</option>
                  <option value="recente">Ordenar por Cadastro Recente</option>
                </select>

                {/* Add Button */}
                <button
                  onClick={startCreation}
                  className="px-4 py-2 bg-sand-900 hover:bg-sand-950 !text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto transition-colors"
                  style={{ color: '#ffffff', backgroundColor: '#352f27' }}
                >
                  <PlusCircle size={14} className="!text-white" style={{ color: '#ffffff' }} />
                  <span className="!text-white" style={{ color: '#ffffff' }}>Novo Paciente</span>
                </button>

              </div>
            </div>

            {/* List Content */}
            {loading ? (
              // Skeleton Loading
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm divide-y divide-sand-100 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-5 flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-4 w-1/3">
                      <div className="h-10 w-10 rounded-xl bg-sand-100" />
                      <div className="space-y-2 w-full">
                        <div className="h-3 bg-sand-100 rounded w-3/4" />
                        <div className="h-2 bg-sand-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-sand-100 rounded w-1/6" />
                    <div className="h-3 bg-sand-100 rounded w-1/6" />
                    <div className="h-6 bg-sand-100 rounded-full w-16" />
                  </div>
                ))}
              </div>
            ) : filteredPatients.length > 0 ? (
              // Patients Responsive Table & Cards
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden">
                {/* Table for Desktop/Tablet */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-sand-50/60 border-b border-sand-100 text-[10px] font-bold text-sand-500 uppercase tracking-wider font-mono">
                        <th className="py-4 px-6">Paciente</th>
                        <th className="py-4 px-6">Contato principal</th>
                        <th className="py-4 px-6">Última consulta</th>
                        <th className="py-4 px-6">Próxima consulta</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100 text-xs">
                      {filteredPatients.map((pt) => (
                        <tr 
                          key={pt.id} 
                          className="hover:bg-sand-50/20 group transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedPatient(pt);
                            setActiveTab('cadastro');
                          }}
                        >
                          {/* Name & Avatar */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-sand-100 text-sand-700 flex items-center justify-center font-bold text-xs border border-sand-200/50 uppercase">
                                {(pt.nome || pt.name || 'P').substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-sand-900 group-hover:text-softblue-600 transition-colors">
                                  {pt.nome || pt.name}
                                </p>
                                <p className="text-[10px] text-sand-400 mt-0.5 font-mono">
                                  CPF: {pt.cpf ? pt.cpf : 'Não informado'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-sand-800 font-mono">
                                {pt.telefone || pt.phone || 'Não informado'}
                              </p>
                              <p className="text-[10px] text-sand-400 truncate max-w-[150px]">
                                {pt.email || 'Não informado'}
                              </p>
                            </div>
                          </td>

                          {/* Última Consulta */}
                          <td className="py-4 px-6 text-sand-600 font-mono text-[11px]">
                            {pt.ultimaConsulta || '--/--/----'}
                          </td>

                          {/* Próxima Consulta */}
                          <td className="py-4 px-6 text-sand-600 font-mono text-[11px]">
                            {pt.proximaConsulta || 'Nenhuma agendada'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              (pt.status || 'Ativo') === 'Ativo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-sand-150 text-sand-600 border border-sand-200'
                            }`}>
                              {pt.status || 'Ativo'}
                            </span>
                          </td>

                          {/* Action view profile */}
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPatient(pt);
                                  setActiveTab('cadastro');
                                }}
                                className="p-1.5 hover:bg-sand-100 text-sand-700 rounded-lg flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                                title="Ver Prontuário / Ficha completa"
                              >
                                <span>Ver Prontuário</span>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards for Mobile */}
                <div className="block md:hidden divide-y divide-sand-100 bg-white">
                  {filteredPatients.map((pt) => (
                    <div 
                      key={pt.id} 
                      className="p-5 space-y-4 hover:bg-sand-50/20 active:bg-sand-100/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPatient(pt);
                        setActiveTab('cadastro');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-sand-100 text-sand-700 flex items-center justify-center font-bold text-xs border border-sand-200/50 uppercase">
                            {(pt.nome || pt.name || 'P').substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-sand-900">
                              {pt.nome || pt.name}
                            </p>
                            <p className="text-[10px] text-sand-400 mt-0.5 font-mono">
                              CPF: {pt.cpf ? pt.cpf : 'Não informado'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          (pt.status || 'Ativo') === 'Ativo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-sand-150 text-sand-600 border border-sand-200'
                        }`}>
                          {pt.status || 'Ativo'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] font-mono border-t border-b border-sand-100/50 py-2.5 text-sand-600">
                        <div>
                          <p className="text-[9px] text-sand-400 font-bold uppercase">Telefone</p>
                          <p className="font-bold text-sand-800">{pt.telefone || pt.phone || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-sand-400 font-bold uppercase">E-mail</p>
                          <p className="truncate max-w-[120px]">{pt.email || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-sand-400 font-bold uppercase">Última Consulta</p>
                          <p>{pt.ultimaConsulta || '--/--/----'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-sand-400 font-bold uppercase">Próxima Consulta</p>
                          <p>{pt.proximaConsulta || 'Nenhuma agendada'}</p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedPatient(pt);
                            setActiveTab('cadastro');
                          }}
                          className="px-4 py-2 bg-sand-50 hover:bg-sand-100 text-sand-800 border border-sand-200 rounded-xl font-bold text-[10px] uppercase cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <span>Abrir</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Empty State (Stunning UI)
              <div className="bg-white p-12 text-center rounded-2xl border border-sand-200 shadow-sm max-w-lg mx-auto py-16 space-y-5">
                <div className="h-14 w-14 rounded-full bg-sand-50 border border-sand-200 flex items-center justify-center mx-auto text-sand-400">
                  <Users size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-sand-950 font-serif">Nenhum Paciente Encontrado</h3>
                  <p className="text-xs text-sand-600 leading-relaxed">
                    Você ainda não possui pacientes cadastrados ou nenhuma ficha atende aos filtros de pesquisa selecionados no momento.
                  </p>
                </div>
                <button
                  onClick={startCreation}
                  className="px-5 py-2.5 bg-sand-900 hover:bg-sand-950 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <PlusCircle size={14} />
                  <span>Cadastrar Primeiro Paciente</span>
                </button>
              </div>
            )}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
