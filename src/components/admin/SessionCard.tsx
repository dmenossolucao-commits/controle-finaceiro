import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Edit3, Trash2, Calendar, Clock, Monitor, Building, CheckCircle, AlertTriangle, HelpCircle, User, Paperclip, FileText, CheckSquare, ShieldCheck } from 'lucide-react';
import { PatientRecord } from '../../types';

interface SessionCardProps {
  record: PatientRecord;
  sessionNumber: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  record,
  sessionNumber,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderFormattedContent = (content: string) => {
    if (!content) return { __html: '' };
    if (content.trim().startsWith('<') || content.includes('</')) {
      return { __html: content };
    }
    return { __html: content.replace(/\n/g, '<br />') };
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'Realizada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={10} />
            <span>Realizada</span>
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={10} />
            <span>Cancelada</span>
          </span>
        );
      case 'Remarcada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle size={10} />
            <span>Remarcada</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-sand-100 text-sand-700 border border-sand-250">
            <span>{statusStr}</span>
          </span>
        );
    }
  };

  const getModalityBadge = (mod: string) => {
    if (mod === 'Online') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-softblue-50 text-softblue-700 border border-softblue-100">
          <Monitor size={10} />
          <span>Atendimento Online</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-sand-100 text-sand-700 border border-sand-200">
        <Building size={10} />
        <span>Atendimento Presencial</span>
      </span>
    );
  };

  return (
    <div id={`session-record-${record.id}`} className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden transition-all hover:border-sand-300">
      
      {/* Header section clickable to expand */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-sand-50/40 select-none"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-sand-50 border border-sand-200 flex flex-col items-center justify-center font-mono">
            <span className="text-[9px] uppercase tracking-wider text-sand-400 font-bold">Sessão</span>
            <span className="text-sm font-bold text-sand-800 -mt-0.5">{String(sessionNumber).padStart(2, '0')}</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sand-900 font-mono">
                {formatDate(record.sessionDate)}
              </span>
              <span className="text-[10px] text-sand-400">•</span>
              <span className="text-[10px] font-semibold text-sand-500 font-mono">
                {record.startTime} • {record.duration} min
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {getModalityBadge(record.modality)}
              {getStatusBadge(record.status)}
              {record.objective && (
                <p className="text-[11px] text-sand-600 truncate max-w-xs sm:max-w-md font-mono italic">
                  &ldquo;{record.objective}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-sand-500 bg-sand-50 border border-sand-100 px-2 py-1 rounded-lg">
            <User size={11} className="text-sand-400" />
            <span className="font-semibold">{record.createdBy || 'Psicóloga Erica Costa'}</span>
          </div>

          <div className="text-sand-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Content with beautiful smooth height transition */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-5 pb-5 border-t border-sand-100 pt-4 bg-sand-50/20 text-xs text-sand-800 space-y-5">
              
              {/* Core Evolution Text */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-softblue-600 uppercase font-mono tracking-wider flex items-center gap-1">
                  <FileText size={11} />
                  <span>Evolução Clínica & Intervenções</span>
                </span>
                <div 
                  className="bg-white p-4 rounded-xl border border-sand-200/60 leading-relaxed text-sand-900 shadow-sm font-sans text-[11px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-1"
                  dangerouslySetInnerHTML={renderFormattedContent(record.clinicalEvolution)}
                />
              </div>

              {/* Obs & Plan side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {record.observations && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-sand-500 uppercase font-mono tracking-wider">
                      Observações Clínicas / Sintomas
                    </span>
                    <div className="bg-white p-3.5 rounded-xl border border-sand-200/50 leading-relaxed whitespace-pre-wrap text-sand-750 font-mono text-[11px]">
                      {record.observations}
                    </div>
                  </div>
                )}
                
                {record.nextSessionPlan && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-sand-500 uppercase font-mono tracking-wider flex items-center gap-1">
                      <CheckSquare size={11} className="text-sand-400" />
                      <span>Plano Terapêutico Próxima Sessão</span>
                    </span>
                    <div className="bg-white p-3.5 rounded-xl border border-sand-200/50 leading-relaxed whitespace-pre-wrap text-sand-750 font-mono text-[11px]">
                      {record.nextSessionPlan}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {record.attachments && record.attachments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-sand-500 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Paperclip size={11} />
                    <span>Anexos Clínicos Associados</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {record.attachments.map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-sand-200 rounded-lg hover:bg-sand-50 font-mono text-[10px] text-sand-700 transition-colors"
                      >
                        <FileText size={12} className="text-sand-400" />
                        <span className="font-semibold underline">{file.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital signature footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-sand-200/60 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-800">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="font-bold">ASSINADO DIGITALMENTE</span>
                  <span className="text-sand-400">|</span>
                  <span className="text-sand-600 font-semibold">{record.signature?.signedBy || 'Psicóloga Erica Costa'}</span>
                  <span className="text-sand-400">|</span>
                  <span className="text-sand-500">
                    {new Date(record.signature?.signedAt || record.createdAt).toLocaleDateString('pt-BR')} às {new Date(record.signature?.signedAt || record.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-1.5 hover:bg-sand-50 border border-sand-200 hover:text-sand-900 rounded-lg flex items-center gap-1 font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    <Edit3 size={12} />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="p-1.5 hover:bg-rose-50 border border-rose-100 hover:text-rose-600 text-rose-500 rounded-lg flex items-center gap-1 font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
