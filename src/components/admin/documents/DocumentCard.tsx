import React, { useState } from 'react';
import { 
  FileText, 
  FileImage, 
  FileAudio, 
  File, 
  Eye, 
  Download, 
  Edit3, 
  Trash2, 
  Calendar, 
  HardDrive,
  Check,
  X
} from 'lucide-react';
import { PatientDocument } from '../../../types';

interface DocumentCardProps {
  document: PatientDocument;
  layout: 'grid' | 'list';
  onView: () => void;
  onDownload: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  layout,
  onView,
  onDownload,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(doc.fileName);
  const [submitting, setSubmitting] = useState(false);

  const isImage = doc.fileType.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf';
  const isAudio = doc.fileType.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(doc.fileType.split('/')[1] || '');

  const getFileIcon = () => {
    if (isImage) return <FileImage size={20} className="text-emerald-500" />;
    if (isPdf) return <FileText size={20} className="text-rose-500" />;
    if (isAudio) return <FileAudio size={20} className="text-softblue-500" />;
    return <File size={20} className="text-sand-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSaveRename = async () => {
    if (!editedName.trim() || editedName === doc.fileName) {
      setIsEditing(false);
      return;
    }
    setSubmitting(true);
    try {
      await onRename(editedName.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving rename:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Grid layout card
  if (layout === 'grid') {
    return (
      <div 
        id={`doc-card-${doc.id}`}
        className="bg-white rounded-2xl border border-sand-200/80 hover:border-sand-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
      >
        <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
          {/* Header area with Category & Icon */}
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-sand-100 text-sand-700 border border-sand-200">
              {doc.category}
            </span>
            <div className="h-8 w-8 rounded-xl bg-sand-50 border border-sand-100 flex items-center justify-center">
              {getFileIcon()}
            </div>
          </div>

          {/* Title and Editing */}
          <div className="min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1.5 mt-1 bg-sand-50 p-1.5 rounded-xl border border-sand-250">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full text-xs font-mono focus:outline-none bg-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                  }}
                />
                <button
                  onClick={handleSaveRename}
                  disabled={submitting}
                  className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <h4 
                onClick={onView}
                className="text-[12px] font-bold text-sand-900 truncate hover:text-softblue-600 cursor-pointer font-sans leading-tight mt-1"
                title={doc.fileName}
              >
                {doc.fileName}
              </h4>
            )}

            {doc.description && (
              <p className="text-[10px] text-sand-500 truncate font-mono italic mt-1 leading-normal">
                {doc.description}
              </p>
            )}
          </div>

          {/* Technical Info */}
          <div className="flex items-center justify-between text-[10px] font-mono text-sand-400 border-t border-sand-50 pt-2 flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              <span>{formatDate(doc.uploadedAt)}</span>
            </span>
            <span className="flex items-center gap-1">
              <HardDrive size={11} />
              <span>{formatSize(doc.fileSize)}</span>
            </span>
          </div>
        </div>

        {/* Hover / persistent bottom action footer */}
        <div className="bg-sand-50/50 p-2 border-t border-sand-100 flex items-center justify-end gap-1 shrink-0">
          <button
            onClick={onView}
            className="p-1.5 hover:bg-sand-100 text-sand-500 hover:text-sand-950 rounded-lg transition-colors cursor-pointer"
            title="Visualizar"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 hover:bg-sand-100 text-sand-500 hover:text-sand-950 rounded-lg transition-colors cursor-pointer"
            title="Download"
          >
            <Download size={13} />
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-sand-100 text-sand-500 hover:text-sand-950 rounded-lg transition-colors cursor-pointer"
            title="Renomear"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  // List layout item (wide row)
  return (
    <div 
      id={`doc-card-${doc.id}`}
      className="bg-white rounded-xl border border-sand-200/80 hover:border-sand-300 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm transition-all"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-sand-50 border border-sand-100 flex items-center justify-center shrink-0">
          {getFileIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-sand-150 text-sand-700 border border-sand-200">
              {doc.category}
            </span>
            <span className="text-[10px] font-mono text-sand-400">
              {formatSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
            </span>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-1 bg-sand-50 p-1 rounded-xl border border-sand-250 max-w-sm">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full text-xs font-mono focus:outline-none bg-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                }}
              />
              <button
                onClick={handleSaveRename}
                disabled={submitting}
                className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer"
              >
                <Check size={11} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <h4 
              onClick={onView}
              className="text-xs font-bold text-sand-900 truncate hover:text-softblue-600 cursor-pointer font-sans leading-tight mt-0.5"
            >
              {doc.fileName}
            </h4>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto border-t sm:border-t-0 border-sand-50 pt-2 sm:pt-0 shrink-0">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-sand-50 text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg flex items-center gap-1 font-semibold text-[10px] cursor-pointer font-mono"
        >
          <Eye size={12} />
          <span className="hidden md:inline">Visualizar</span>
        </button>
        <button
          onClick={onDownload}
          className="p-1.5 hover:bg-sand-50 text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg flex items-center gap-1 font-semibold text-[10px] cursor-pointer font-mono"
        >
          <Download size={12} />
          <span className="hidden md:inline">Baixar</span>
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 hover:bg-sand-50 text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg flex items-center gap-1 font-semibold text-[10px] cursor-pointer font-mono"
        >
          <Edit3 size={12} />
          <span className="hidden md:inline">Renomear</span>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-rose-100 rounded-lg flex items-center gap-1 font-semibold text-[10px] cursor-pointer font-mono"
        >
          <Trash2 size={12} />
          <span className="hidden md:inline">Excluir</span>
        </button>
      </div>
    </div>
  );
};
