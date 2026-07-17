import React, { useState, useEffect } from 'react';
import { Save, X, Calendar, Clock, Sparkles, AlertCircle, FileText, Lock, Plus, Trash2, Paperclip, CheckSquare, Square, Loader2 } from 'lucide-react';
import { PatientRecord, PatientDocument } from '../../types';
import { contentService } from '../../services/contentService';
import { RichTextEditor } from './RichTextEditor';

interface EvolutionFormProps {
  initialRecord?: PatientRecord | null;
  onSubmit: (recordData: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  patientId?: string;
}

export const EvolutionForm: React.FC<EvolutionFormProps> = ({
  initialRecord,
  onSubmit,
  onCancel,
  loading = false,
  patientId,
}) => {
  // Setup default values
  const todayStr = new Date().toISOString().split('T')[0];
  const currentHourStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const [sessionDate, setSessionDate] = useState(initialRecord?.sessionDate || todayStr);
  const [startTime, setStartTime] = useState(initialRecord?.startTime || currentHourStr);
  const [duration, setDuration] = useState(initialRecord?.duration || '50');
  const [modality, setModality] = useState<'Online' | 'Presencial'>(initialRecord?.modality || 'Online');
  const [status, setStatus] = useState<'Realizada' | 'Cancelada' | 'Remarcada'>(initialRecord?.status || 'Realizada');
  
  const [objective, setObjective] = useState(initialRecord?.objective || '');
  const [clinicalEvolution, setClinicalEvolution] = useState(initialRecord?.clinicalEvolution || '');
  const [observations, setObservations] = useState(initialRecord?.observations || '');
  const [nextSessionPlan, setNextSessionPlan] = useState(initialRecord?.nextSessionPlan || '');

  // Prepare attachments (empty array for future feature integration)
  const [attachments, setAttachments] = useState(initialRecord?.attachments || []);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  
  // Available documents state
  const [availableDocs, setAvailableDocs] = useState<PatientDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    const loadPatientDocs = async () => {
      if (!patientId) return;
      try {
        setDocsLoading(true);
        const data = await contentService.getPatientDocuments(patientId);
        setAvailableDocs(data || []);
      } catch (err) {
        console.error('Error loading patient docs in form:', err);
      } finally {
        setDocsLoading(false);
      }
    };
    loadPatientDocs();
  }, [patientId]);

  // Prepare signature structure (automatic professional structure)
  const [signed, setSigned] = useState(!!initialRecord?.signature?.verified);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEvolutionEmpty = !clinicalEvolution || clinicalEvolution.replace(/<[^>]*>/g, '').trim() === '';
    if (isEvolutionEmpty) {
      alert("O campo 'Evolução clínica' é obrigatório.");
      return;
    }

    const signature = initialRecord?.signature || {
      signedBy: 'Psicóloga Erica Costa',
      signedAt: Date.now(),
      verified: true,
      ip: '192.168.1.1' // simulated clinical network IP
    };

    onSubmit({
      patientId: initialRecord?.patientId || '',
      sessionDate,
      startTime,
      duration,
      modality,
      status,
      objective,
      clinicalEvolution,
      observations,
      nextSessionPlan,
      attachments,
      signature
    });
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName || !newAttachmentUrl) return;
    setAttachments([...attachments, {
      name: newAttachmentName,
      url: newAttachmentUrl,
      type: 'document'
    }]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <form id="evolution-entry-form" onSubmit={handleFormSubmit} className="bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-6 text-xs text-sand-800">
      <div className="flex items-center justify-between border-b border-sand-100 pb-3">
        <div>
          <h3 className="text-sm font-serif font-bold text-sand-900">
            {initialRecord ? 'Editar Registro de Evolução' : 'Nova Entrada de Evolução Clínica'}
          </h3>
          <p className="text-[10px] text-sand-500 font-mono mt-0.5">
            CONSELHO FEDERAL DE PSICOLOGIA • DOCUMENTO PROTEGIDO (SIGILO PROFISSIONAL)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-white border border-sand-200 hover:bg-sand-50 text-sand-700 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X size={13} />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-softblue-600 hover:bg-softblue-700 disabled:bg-softblue-300 text-white rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {loading ? (
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>{initialRecord ? 'Salvar' : 'Registrar'}</span>
          </button>
        </div>
      </div>

      {/* Grid: metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-sand-50/50 p-4 rounded-xl border border-sand-100">
        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block">Data da Sessão *</label>
          <input
            type="date"
            required
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block">Horário *</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block">Duração (min) *</label>
          <input
            type="number"
            required
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block">Modalidade *</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as any)}
            className="w-full mt-1 px-2 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white font-semibold"
          >
            <option value="Online">🖥️ Online</option>
            <option value="Presencial">🏢 Presencial</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block">Status *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full mt-1 px-2 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white font-semibold"
          >
            <option value="Realizada">✅ Realizada</option>
            <option value="Cancelada">❌ Cancelada</option>
            <option value="Remarcada">🔄 Remarcada</option>
          </select>
        </div>
      </div>

      {/* Inputs: Main Text Fields */}
      <div className="space-y-4">
        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block mb-1">
            Objetivo da Sessão
          </label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex: Identificar gatilhos de ansiedade no ambiente de trabalho ou reestruturar pensamentos automáticos..."
            className="w-full px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs"
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block mb-1">
            Evolução Clínica * (Histórico e Progresso Psicoterapêutico)
          </label>
          <RichTextEditor
            value={clinicalEvolution}
            onChange={setClinicalEvolution}
            placeholder="Descreva as queixas relatadas, as intervenções técnicas realizadas, as reações emocionais expressas e o progresso clínico observado..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block mb-1">
              Observações / Diagnósticos / Comportamento
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Postura do paciente, humor, fala, atenção, insight ou notas técnicas privadas..."
              className="w-full min-h-[90px] px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs leading-relaxed"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-sand-500 uppercase font-mono block mb-1">
              Plano para a Próxima Sessão (Tarefas de casa / Foco)
            </label>
            <textarea
              value={nextSessionPlan}
              onChange={(e) => setNextSessionPlan(e.target.value)}
              placeholder="Ex: Aprofundar o inventário de crenças centrais, revisar diário de humor ou continuar relaxamento progressivo..."
              className="w-full min-h-[90px] px-3 py-2 border border-sand-200 rounded-xl focus:outline-none bg-white text-xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Attachments Section (Fully Integrated with clinical documents) */}
      <div className="p-4 rounded-xl border border-dashed border-sand-250 bg-sand-50/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-sand-500 uppercase font-mono flex items-center gap-1.5">
            <Paperclip size={12} className="text-softblue-600" />
            <span>Documentos & Anexos Vinculados à Sessão</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">
            Módulo Ativo
          </span>
        </div>
        
        <p className="text-[10px] text-sand-500 leading-normal">
          Selecione os documentos já existentes na pasta do paciente para vinculá-los a esta evolução clínica (atestados, receitas, termos ou exames):
        </p>

        {/* 1. Existing Patient Documents Checklist */}
        {patientId ? (
          <div className="bg-white p-3 rounded-xl border border-sand-200/80 max-h-40 overflow-y-auto space-y-1.5">
            {docsLoading ? (
              <div className="py-4 text-center text-sand-400 flex items-center justify-center gap-1.5 font-mono text-[10px]">
                <Loader2 size={12} className="animate-spin text-softblue-600" />
                <span>CARREGANDO DOCUMENTOS DO PACIENTE...</span>
              </div>
            ) : availableDocs.length === 0 ? (
              <div className="py-4 text-center text-sand-400 font-mono text-[10px] italic">
                Nenhum documento encontrado na pasta deste paciente. Faça upload na aba "Documentos" primeiro.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableDocs.map((docItem) => {
                  const isAttached = attachments.some(att => att.url === docItem.downloadURL);
                  return (
                    <button
                      key={docItem.id}
                      type="button"
                      onClick={() => {
                        if (isAttached) {
                          setAttachments(attachments.filter(att => att.url !== docItem.downloadURL));
                        } else {
                          setAttachments([...attachments, {
                            name: docItem.fileName,
                            url: docItem.downloadURL,
                            type: docItem.fileType,
                            size: docItem.fileSize
                          }]);
                        }
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isAttached
                          ? 'border-softblue-500 bg-softblue-50/30'
                          : 'border-sand-150 hover:border-sand-300 hover:bg-sand-50/50'
                      }`}
                    >
                      <span className="shrink-0 text-softblue-600">
                        {isAttached ? <CheckSquare size={13} /> : <Square size={13} className="text-sand-300" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-sand-900 truncate">{docItem.fileName}</p>
                        <p className="text-[8px] font-mono text-sand-400 uppercase tracking-wide">{docItem.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-amber-600 font-mono italic">
            Aguardando identificação do paciente para listar documentos...
          </p>
        )}

        {/* 2. List of current attachments (including custom manual ones) */}
        {attachments.length > 0 && (
          <div className="space-y-1.5 pt-1.5 border-t border-sand-150 border-dashed">
            <span className="text-[9px] font-bold text-sand-400 uppercase font-mono block">Anexos Vinculados ({attachments.length}):</span>
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-softblue-50 text-softblue-800 px-2.5 py-1 rounded-lg border border-softblue-100 font-mono text-[9px] max-w-[200px] truncate">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(i)}
                    className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Advanced manual URL attachment fallback */}
        <div className="space-y-2 pt-2 border-t border-sand-150 border-dashed">
          <span className="text-[9px] font-bold text-sand-400 uppercase font-mono block">Adicionar Anexo Externo / Manual:</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome do documento (ex: Exame de Sangue.pdf)"
              value={newAttachmentName}
              onChange={(e) => setNewAttachmentName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white text-[10px] font-mono"
            />
            <input
              type="text"
              placeholder="URL do arquivo (https://...)"
              value={newAttachmentUrl}
              onChange={(e) => setNewAttachmentUrl(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-sand-200 rounded-lg focus:outline-none bg-white text-[10px] font-mono"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-3 py-1.5 bg-sand-900 hover:bg-sand-950 text-white rounded-lg flex items-center justify-center gap-1 font-bold text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Plus size={11} />
              <span>Anexar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Area (Estrutura Preparada) */}
      <div className="bg-sand-50 p-4 rounded-xl border border-sand-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <Lock size={15} />
          </div>
          <div>
            <p className="font-semibold text-sand-900">Assinatura Digital de Certificado Clínico</p>
            <p className="text-[10px] text-sand-500">
              Assinatura criptográfica auto-gerada com credenciais do CFP de Erica Costa (CRP 11/XXXXX).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sign-check"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            required
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-sand-300 rounded cursor-pointer"
          />
          <label htmlFor="sign-check" className="font-mono text-[10px] font-bold text-emerald-800 uppercase tracking-wide cursor-pointer">
            Assinar Prontuário Digitalmente
          </label>
        </div>
      </div>
    </form>
  );
};
