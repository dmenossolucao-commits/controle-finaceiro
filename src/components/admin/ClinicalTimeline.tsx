import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar, 
  ChevronRight, 
  FileText, 
  AlertCircle, 
  PlusCircle, 
  RefreshCw, 
  Lock, 
  Clock, 
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  X,
  FileDown
} from 'lucide-react';
import { Patient, PatientRecord } from '../../types';
import { contentService } from '../../services/contentService';
import { PatientHeader } from './PatientHeader';
import { EvolutionForm } from './EvolutionForm';
import { SessionCard } from './SessionCard';
import { auth } from '../../firebase';

interface ClinicalTimelineProps {
  patient: Patient;
}

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({ patient }) => {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchDate, setSearchDate] = useState('');
  
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatientRecord | null>(null);
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Fetch records
  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contentService.getPatientRecords(patient.id);
      setRecords(data || []);
    } catch (err) {
      console.error("Error loading patient records:", err);
      setError("Não foi possível carregar o prontuário deste paciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      loadRecords();
    }
  }, [patient?.id]);

  // Handle Create / Edit Submit
  const handleFormSubmit = async (recordData: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      setFormSubmitLoading(true);
      const currentUser = auth.currentUser;
      const createdBy = currentUser?.displayName || currentUser?.email || 'Psicóloga Erica Costa';

      if (editingRecord) {
        // Update
        await contentService.updatePatientRecord(editingRecord.id, {
          ...recordData,
          patientId: patient.id,
        });
        
        // Refresh local state
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? {
          ...r,
          ...recordData,
          updatedAt: Date.now()
        } as PatientRecord : r));
        
        setEditingRecord(null);
      } else {
        // Create
        const newRecord = await contentService.createPatientRecord({
          ...recordData,
          patientId: patient.id,
          createdBy,
        });
        
        // Add to records list (at the top since it's sorted newest first)
        setRecords(prev => [newRecord, ...prev]);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error saving patient record:", err);
      alert("Ocorreu um erro ao salvar o registro de evolução.");
    } finally {
      setFormSubmitLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Aviso de Segurança: Tem certeza de que deseja excluir este prontuário de evolução permanente? Esta ação é irreversível conforme diretrizes de auditoria clínica.")) {
      return;
    }

    try {
      await contentService.deletePatientRecord(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err) {
      console.error("Error deleting patient record:", err);
      alert("Erro ao excluir o prontuário de evolução.");
    }
  };

  // Filter records by sessionDate matching the search date string
  const filteredRecords = records.filter(record => {
    if (!searchDate) return true;
    return record.sessionDate.includes(searchDate);
  });

  return (
    <div id="clinical-records-timeline" className="space-y-6">
      
      {/* 1. Header component */}
      <PatientHeader patient={patient} />

      {/* 2. Controls Area (Filter + Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-sand-200/60 shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
            <input
              type="date"
              placeholder="Pesquisar por data (AAAA-MM-DD)"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none bg-white font-mono"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="absolute right-2.5 top-2.5 text-sand-400 hover:text-sand-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setEditingRecord(null);
              setIsFormOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} />
            <span>Nova Evolução</span>
          </button>
          
          <button
            onClick={loadRecords}
            title="Recarregar prontuário"
            className="p-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-sand-500 cursor-pointer transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 3. Form display (inline replacement to stay neat) */}
      <AnimatePresence mode="wait">
        {(isFormOpen || editingRecord) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-l-4 border-softblue-500 rounded-r-2xl overflow-hidden shadow-md"
          >
            <EvolutionForm
              initialRecord={editingRecord}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingRecord(null);
              }}
              loading={formSubmitLoading}
              patientId={patient.id}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Timeline list or Loader */}
      <div className="space-y-4">
        {loading ? (
          /* Skeleton loader cards */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-5 rounded-2xl border border-sand-250/50 space-y-3 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-sand-200 rounded-lg" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-sand-200 rounded" />
                      <div className="h-2.5 w-40 bg-sand-150 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-sand-200 rounded-full" />
                </div>
                <div className="h-10 bg-sand-50 rounded-xl border border-sand-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-100 flex items-center gap-3 text-xs leading-relaxed">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-bold">Falha na Conexão</p>
              <p>{error}</p>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          /* Empty State */
          <div className="bg-white p-12 rounded-3xl border border-sand-200/60 shadow-sm text-center space-y-4 max-w-lg mx-auto py-16">
            <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-bold text-sand-950 font-serif">Nenhum Atendimento Registrado</h3>
            <p className="text-xs text-sand-500 leading-relaxed font-mono uppercase text-[9px]">
              {searchDate ? 'Filtro por data ativo' : 'Aguardando evolução clínica'}
            </p>
            <p className="text-xs text-sand-600 leading-relaxed max-w-sm mx-auto">
              {searchDate 
                ? 'Nenhuma sessão foi encontrada na data informada. Verifique se digitou o formato AAAA-MM-DD correto.' 
                : 'Ainda não existem evoluções gravadas para este paciente. Clique em "Nova Evolução" para registrar a sessão de psicoterapia.'}
            </p>
            {!searchDate && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-4 py-2 bg-sand-900 hover:bg-sand-950 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
              >
                <PlusCircle size={14} />
                <span>Registrar Primeiro Atendimento</span>
              </button>
            )}
          </div>
        ) : (
          /* Clinical timeline cards list, sorted from newest to oldest */
          <div className="relative pl-1 sm:pl-4 space-y-4">
            
            {/* Visual background timeline axis connector */}
            <div className="absolute left-3 sm:left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-sand-200 via-sand-200 to-transparent" />

            {filteredRecords.map((record, index) => {
              // Calculate session number (total sessions minus index of current card)
              const sessionNumber = records.length - records.indexOf(record);

              return (
                <div key={record.id} className="relative pl-7 sm:pl-10">
                  
                  {/* Outer timeline bubble decoration */}
                  <div className="absolute left-[5px] sm:left-[17px] top-6 h-3.5 w-3.5 rounded-full border-2 border-softblue-500 bg-white shadow-sm flex items-center justify-center z-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-softblue-500" />
                  </div>

                  <SessionCard
                    record={record}
                    sessionNumber={sessionNumber}
                    onEdit={() => {
                      setEditingRecord(record);
                      setIsFormOpen(false);
                      // Scroll to view the form nicely
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    onDelete={() => handleDeleteRecord(record.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
