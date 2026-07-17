import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  Search, 
  Grid, 
  List, 
  Filter, 
  Calendar, 
  HardDrive, 
  RefreshCw, 
  Trash2, 
  FileText, 
  ShieldAlert, 
  AlertCircle,
  X,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { Patient, PatientDocument } from '../../../types';
import { contentService } from '../../../services/contentService';
import { DocumentCard } from './DocumentCard';
import { DocumentUploader } from './DocumentUploader';
import { DocumentViewer } from './DocumentViewer';
import { ScannerCapture } from './ScannerCapture';
import { STANDARD_CATEGORIES } from './CategorySelector';
import { auth } from '../../../firebase';

interface DocumentManagerProps {
  patient: Patient;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ patient }) => {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout preference
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // View state switches
  const [managerMode, setManagerMode] = useState<'list' | 'upload' | 'scanner'>('list');
  const [viewingDoc, setViewingDoc] = useState<PatientDocument | null>(null);
  
  // Custom categories added on top
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contentService.getPatientDocuments(patient.id);
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading patient documents:', err);
      setError('Não foi possível carregar os documentos deste paciente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      loadDocuments();
    }
  }, [patient?.id]);

  // Rename Document
  const handleRenameDocument = async (docId: string, newName: string) => {
    try {
      // Ensure file extension remains intact
      const docToRename = documents.find(d => d.id === docId);
      if (!docToRename) return;

      const ext = docToRename.fileName.split('.').pop();
      const finalName = ext && !newName.endsWith(`.${ext}`) ? `${newName}.${ext}` : newName;

      await contentService.updatePatientDocument(docId, { fileName: finalName });
      
      // Update local state
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, fileName: finalName } : d));
    } catch (err) {
      console.error('Error renaming document:', err);
      alert('Não foi possível renomear o documento.');
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;

    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o documento "${docToDelete.fileName}"? Esta ação é irreversível e o arquivo será deletado do servidor.`)) {
      return;
    }

    try {
      // 1. Delete from Firebase Storage
      if (docToDelete.storagePath) {
        await contentService.deleteDocumentFile(docToDelete.storagePath);
      }
      
      // 2. Delete from Firestore collection
      await contentService.deletePatientDocument(docId);

      // 3. Update local list state
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Ocorreu um erro ao excluir o documento.');
    }
  };

  // Force trigger browser file download proxy with strict authentication validation
  const handleDownloadFile = (docToDownload: PatientDocument) => {
    try {
      const isAuthorized = auth.currentUser && (
        auth.currentUser.email === 'ericacostapsicologa7@gmail.com' ||
        auth.currentUser.email === 'd-briciod2@hotmail.com' ||
        auth.currentUser.email === 'admin@ericacostapsi.com.br' ||
        auth.currentUser.email === 'dmenossolucao@gmail.com'
      );

      if (!isAuthorized) {
        alert('Acesso Negado: Você precisa estar autenticado como administrador autorizado para baixar arquivos clínicos.');
        return;
      }

      const link = document.createElement('a');
      link.href = docToDownload.downloadURL;
      link.download = docToDownload.fileName;
      link.target = '_blank';
      link.referrerPolicy = 'no-referrer';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Erro ao tentar iniciar o download do arquivo.');
    }
  };

  // Add custom category locally or extend standard array
  const handleAddCustomCategory = (newCat: string) => {
    if (!customCategories.includes(newCat)) {
      setCustomCategories(prev => [...prev, newCat]);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedType('All');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Filter application pipeline
  const filteredDocuments = documents.filter((doc) => {
    // 1. Text Search matching name, description or tags
    const matchesSearch = 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Category matching
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;

    // 3. Format/Type matching
    let matchesType = true;
    if (selectedType !== 'All') {
      if (selectedType === 'PDF') matchesType = doc.fileType === 'application/pdf';
      else if (selectedType === 'Image') matchesType = doc.fileType.startsWith('image/');
      else if (selectedType === 'Audio') matchesType = doc.fileType.startsWith('audio/');
      else if (selectedType === 'Other') {
        matchesType = !doc.fileType.startsWith('image/') && !doc.fileType.startsWith('audio/') && doc.fileType !== 'application/pdf';
      }
    }

    // 4. Date range matching (uploadedAt matches dates formatted as YYYY-MM-DD)
    let matchesDateRange = true;
    if (filterStartDate) {
      const startMs = new Date(`${filterStartDate}T00:00:00`).getTime();
      matchesDateRange = matchesDateRange && doc.uploadedAt >= startMs;
    }
    if (filterEndDate) {
      const endMs = new Date(`${filterEndDate}T23:59:59`).getTime();
      matchesDateRange = matchesDateRange && doc.uploadedAt <= endMs;
    }

    return matchesSearch && matchesCategory && matchesType && matchesDateRange;
  });

  return (
    <div id="patient-documents-module" className="space-y-6">
      
      {/* 1. Module Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-sand-200/60 shadow-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="text-softblue-600 shrink-0" size={18} />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-sand-900 font-sans tracking-wide uppercase">
              Gerenciador de Documentos
            </h3>
            <p className="text-[10px] text-sand-500 font-mono mt-0.5">
              Pasta do Paciente: <span className="font-bold underline">{patient.name}</span>
            </p>
          </div>
        </div>

        {managerMode === 'list' && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Nova camera scanner button */}
            <button
              onClick={() => setManagerMode('scanner')}
              className="px-3.5 py-2 bg-sand-900 hover:bg-sand-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Camera size={14} />
              <span>Escanear Doc</span>
            </button>

            {/* Standard file uploader trigger */}
            <button
              onClick={() => setManagerMode('upload')}
              className="px-3.5 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              <span>Enviar Arquivo</span>
            </button>

            <button
              onClick={loadDocuments}
              title="Recarregar Pasta"
              className="p-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-sand-500 cursor-pointer transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Upload and Scanner Panels */}
      {managerMode === 'upload' && (
        <DocumentUploader
          patient={patient}
          onUploadSuccess={(newDoc) => {
            setDocuments(prev => [newDoc, ...prev]);
            setManagerMode('list');
          }}
          onCancel={() => setManagerMode('list')}
          customCategories={customCategories}
          onAddCustomCategory={handleAddCustomCategory}
        />
      )}

      {managerMode === 'scanner' && (
        <ScannerCapture
          patient={patient}
          onDocumentCaptured={(newDoc) => {
            setDocuments(prev => [newDoc, ...prev]);
            setManagerMode('list');
          }}
          onClose={() => setManagerMode('list')}
        />
      )}

      {/* 3. Search and Filtering bar */}
      {managerMode === 'list' && (
        <div className="bg-white p-4 rounded-xl border border-sand-200/60 shadow-sm space-y-3.5">
          {/* Main search and view toggle */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome, descrição ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-sand-200 focus:outline-none bg-white font-mono placeholder:text-sand-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-sand-400 hover:text-sand-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Category selector filter */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-xs bg-white border border-sand-200 rounded-xl focus:outline-none font-mono cursor-pointer appearance-none min-w-[130px]"
                >
                  <option value="All">Todas Categorias</option>
                  {[...STANDARD_CATEGORIES, ...customCategories].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Filter className="absolute right-2.5 top-2.5 h-3 w-3 text-sand-400 pointer-events-none" />
              </div>

              {/* Format/Type selector filter */}
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-xs bg-white border border-sand-200 rounded-xl focus:outline-none font-mono cursor-pointer appearance-none min-w-[110px]"
                >
                  <option value="All">Todos Tipos</option>
                  <option value="PDF">PDFs (.pdf)</option>
                  <option value="Image">Imagens (.jpg, .png)</option>
                  <option value="Audio">Áudios (.mp3, .wav)</option>
                  <option value="Other">Outros</option>
                </select>
                <Filter className="absolute right-2.5 top-2.5 h-3 w-3 text-sand-400 pointer-events-none" />
              </div>

              {/* Grid vs List View toggle */}
              <div className="flex items-center border border-sand-200 rounded-xl overflow-hidden bg-sand-50/50 p-0.5 shrink-0">
                <button
                  onClick={() => setLayout('grid')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                    layout === 'grid'
                      ? 'bg-white shadow-sm text-softblue-600 border border-sand-200/50'
                      : 'text-sand-400 hover:text-sand-700'
                  }`}
                  title="Visualização em Grade"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setLayout('list')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                    layout === 'list'
                      ? 'bg-white shadow-sm text-softblue-600 border border-sand-200/50'
                      : 'text-sand-400 hover:text-sand-700'
                  }`}
                  title="Visualização em Lista"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Date Filters */}
          <div className="flex flex-wrap items-center gap-3 border-t border-sand-100 pt-3">
            <span className="text-[10px] font-bold text-sand-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <Calendar size={11} />
              <span>Filtrar por Período de Upload:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="pl-2.5 pr-2 py-1 bg-white border border-sand-200 rounded-lg text-[10px] font-mono focus:outline-none focus:border-sand-400"
              />
              <span className="text-sand-300 text-[10px]">até</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="pl-2.5 pr-2 py-1 bg-white border border-sand-200 rounded-lg text-[10px] font-mono focus:outline-none focus:border-sand-400"
              />
            </div>

            {(searchTerm || selectedCategory !== 'All' || selectedType !== 'All' || filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-[10px] font-mono text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100/60 rounded-lg border border-rose-100 transition-colors ml-auto cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Display list or Skeleton Loader */}
      {managerMode === 'list' && (
        <>
          {loading ? (
            /* Custom card Skeleton loading state */
            <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white p-5 rounded-2xl border border-sand-200 animate-pulse space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-20 bg-sand-200 rounded" />
                    <div className="h-8 w-8 bg-sand-200 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-sand-200 rounded" />
                    <div className="h-2 w-1/2 bg-sand-150 rounded" />
                  </div>
                  <div className="border-t border-sand-100 pt-3 flex justify-between">
                    <div className="h-2.5 w-16 bg-sand-200 rounded" />
                    <div className="h-2.5 w-12 bg-sand-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Fail Alert Alert */
            <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-100 flex items-center gap-3 text-xs leading-relaxed max-w-lg mx-auto">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Falha ao Conectar</p>
                <p>{error}</p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            /* Empty State */
            <div className="bg-white p-12 rounded-3xl border border-sand-200/60 shadow-sm text-center space-y-4 max-w-lg mx-auto py-16">
              <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100">
                <FileText size={20} />
              </div>
              <h3 className="text-sm font-bold text-sand-950 font-serif">Nenhum Documento Encontrado</h3>
              
              <p className="text-xs text-sand-500 leading-relaxed font-mono uppercase text-[9px]">
                {documents.length > 0 ? 'Filtros ativos' : 'Pasta Clinica Vazia'}
              </p>
              
              <p className="text-xs text-sand-600 leading-relaxed max-w-sm mx-auto">
                {documents.length > 0
                  ? 'Nenhum arquivo na pasta corresponde aos filtros de busca ou intervalo de datas informados.'
                  : 'Ainda não foram anexados arquivos ou contratos clínicos a esta ficha de paciente.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {documents.length > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-sand-100 hover:bg-sand-200 text-sand-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Remover Filtros
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setManagerMode('scanner')}
                      className="px-4 py-2 bg-sand-900 hover:bg-sand-950 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Camera size={13} />
                      <span>Escanear Primeiro Doc</span>
                    </button>
                    <button
                      onClick={() => setManagerMode('upload')}
                      className="px-4 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <PlusCircle size={13} />
                      <span>Anexar Primeiro Arquivo</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Documents List Grid vs List */
            <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {filteredDocuments.map((docItem) => (
                <DocumentCard
                  key={docItem.id}
                  document={docItem}
                  layout={layout}
                  onView={() => setViewingDoc(docItem)}
                  onDownload={() => handleDownloadFile(docItem)}
                  onRename={(newName) => handleRenameDocument(docItem.id, newName)}
                  onDelete={() => handleDeleteDocument(docItem.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 5. Integrated Modal Document Viewer overlay */}
      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDownload={() => handleDownloadFile(viewingDoc)}
        />
      )}

    </div>
  );
};
