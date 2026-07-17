import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, Info, HelpCircle, Check, Loader2, Tag } from 'lucide-react';
import { Patient, PatientDocument } from '../../../types';
import { contentService } from '../../../services/contentService';
import { CategorySelector } from './CategorySelector';

interface DocumentUploaderProps {
  patient: Patient;
  onUploadSuccess: (newDoc: PatientDocument) => void;
  onCancel: () => void;
  customCategories?: string[];
  onAddCustomCategory?: (category: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  patient,
  onUploadSuccess,
  onCancel,
  customCategories = [],
  onAddCustomCategory,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Documentos pessoais');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('ENVIANDO ARQUIVO...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setProgress(0);
    setError(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo para enviar.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Upload file directly using the standard patient-scoped storage pathway
      const uploadResult = await contentService.uploadDocumentFile(
        patient.id,
        file,
        file.name,
        (uploadProgress, status) => {
          setProgress(Math.round(uploadProgress));
          if (status) {
            setStatusText(status);
          }
        }
      );

      // Create patient document record in Firestore collection "patient_documents"
      const docRecord = await contentService.createPatientDocument({
        patientId: patient.id,
        category,
        fileName: file.name,
        originalName: file.name,
        storagePath: uploadResult.storagePath,
        downloadURL: uploadResult.downloadURL,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedBy: 'Psicóloga Erica Costa',
        description,
        tags: [category, ...parsedTags],
        linkedRecordIds: []
      });

      setUploading(false);
      onUploadSuccess(docRecord);
    } catch (err: any) {
      console.error('Error uploading document file:', err);
      if (err.message && err.message.includes('Firebase Storage')) {
        setError(err.message);
      } else {
        setError(`Ocorreu um erro ao enviar este documento para o prontuário do paciente: ${err.message || err}`);
      }
      setUploading(false);
    }
  };

  return (
    <form 
      onSubmit={handleUploadSubmit} 
      className="bg-white rounded-3xl border border-sand-200/80 shadow-md p-6 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-sand-100 pb-3">
        <h3 className="text-sm font-bold text-sand-950 font-serif">Enviar Novo Documento Clínico</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-softblue-700 hover:text-softblue-900 hover:underline cursor-pointer font-mono transition-all"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-100 text-[11px] font-mono leading-relaxed">
          {error}
        </div>
      )}

      {/* 1. File Selection Area */}
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-softblue-500 bg-softblue-50/25'
              : 'border-sand-250 bg-sand-50/20 hover:bg-sand-50/40 hover:border-sand-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,audio/*"
          />
          <UploadCloud size={32} className="text-sand-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-sand-900 font-serif">Arraste um documento para cá</p>
          <p className="text-[10px] text-sand-500 font-mono uppercase tracking-wider mt-0.5">ou clique para procurar em seu computador</p>
          <p className="text-[9px] text-sand-400 font-mono mt-3">
            Formatos suportados: PDF, JPG, PNG, WEBP, DOCX, XLSX e Áudios (MP3/WAV)
          </p>
        </div>
      ) : (
        <div className="bg-sand-50/40 border border-sand-200 rounded-2xl p-4 flex items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl border border-sand-200 flex items-center justify-center text-sand-500 shrink-0 shadow-sm">
              <File size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sand-900 truncate">{file.name}</p>
              <p className="text-[10px] text-sand-400">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Formato desconhecido'}
              </p>
            </div>
          </div>

          {!uploading && (
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer"
              title="Remover arquivo"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* 2. Upload Progress Bar */}
      {uploading && (
        <div className="space-y-2 bg-sand-50/30 p-4 rounded-2xl border border-sand-150/60">
          <div className="flex items-center justify-between font-mono text-[10px] text-sand-500 font-bold">
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-softblue-600" />
              <span>{statusText.toUpperCase()}</span>
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-sand-200 rounded-full overflow-hidden">
            <div 
              className="bg-softblue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Category selector */}
      <CategorySelector
        selectedCategory={category}
        onChange={setCategory}
        customCategories={customCategories}
        onAddCustomCategory={onAddCustomCategory}
      />

      {/* 4. Description & Tags Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-sand-500 uppercase font-mono tracking-wider">
            Descrição / Anotações Rápidas
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Contrato de confidencialidade de atendimento online assinado eletronicamente..."
            rows={3}
            className="w-full text-xs font-mono border border-sand-200 rounded-xl p-3 focus:outline-none focus:border-sand-400 bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-sand-500 uppercase font-mono tracking-wider">
            Palavras-chave / Tags (Separadas por vírgulas)
          </label>
          <div className="relative">
            <Tag size={13} className="absolute left-3.5 top-3.5 text-sand-400" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: contrato, assinado, online, sigilo"
              className="w-full pl-9 pr-4 py-3 text-xs font-mono border border-sand-200 rounded-xl focus:outline-none focus:border-sand-400 bg-white"
            />
          </div>
          <span className="text-[9px] font-mono text-sand-400 block leading-normal">
            Facilita a busca e organização dos documentos do prontuário posteriormente.
          </span>
        </div>
      </div>

      {/* 5. Submit Panel */}
      <div className="flex items-center justify-end gap-3 border-t border-sand-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 bg-sand-100 hover:bg-sand-200 border border-sand-300 rounded-xl text-xs font-bold text-sand-800 hover:text-sand-950 cursor-pointer transition-colors"
        >
          Voltar
        </button>

        <button
          type="submit"
          disabled={uploading || !file}
          className="px-5 py-2 bg-softblue-600 hover:bg-softblue-700 disabled:opacity-45 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Check size={13} />
              <span>Salvar Documento</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
