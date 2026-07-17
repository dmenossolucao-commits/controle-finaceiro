import React, { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, Calendar, User, HardDrive, Paperclip, Music, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { PatientDocument } from '../../../types';
import { auth } from '../../../firebase';

interface DocumentViewerProps {
  document: PatientDocument;
  onClose: () => void;
  onDownload?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: doc,
  onClose,
  onDownload,
}) => {
  // Check authorization - only active authenticated admin users can open clinical files
  const isAuthorized = auth.currentUser && (
    auth.currentUser.email === 'ericacostapsicologa7@gmail.com' ||
    auth.currentUser.email === 'd-briciod2@hotmail.com' ||
    auth.currentUser.email === 'admin@ericacostapsi.com.br' ||
    auth.currentUser.email === 'dmenossolucao@gmail.com'
  );

  const openPdfInNewTab = () => {
    try {
      let url = doc.downloadURL;
      if (url.startsWith('data:application/pdf;base64,')) {
        const base64Parts = url.split(',');
        const base64Data = base64Parts[1];
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
      }
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert("O bloqueador de pop-ups impediu a abertura do PDF. Por favor, permita pop-ups para este site.");
      }
    } catch (err) {
      console.error("Erro ao abrir PDF:", err);
      window.open(doc.downloadURL, '_blank');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-sand-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
            <X size={32} />
          </div>
          <h3 className="text-lg font-serif font-bold text-rose-950">Acesso Negado</h3>
          <p className="text-xs text-sand-600 leading-relaxed">
            Sessão expirada ou não autorizada. Cada documento clínico do MenteCare deve ser validado e autorizado individualmente por um administrador autenticado antes de ser exibido.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const isImage = doc.fileType.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf';
  const isAudio = doc.fileType.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(doc.fileType.split('/')[1] || '');

  // States for PDF.js rendering
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Dynamic loading of PDF.js from CDN
  useEffect(() => {
    if (!isPdf) return;

    let isMounted = true;

    const loadPdfjsAndDocument = async () => {
      try {
        if (isMounted) {
          setPdfLoading(true);
          setPdfError(null);
        }

        // 1. Inject PDF.js library from Cloudflare CDN if not already on window
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de visualização de PDF.js do CDN.'));
            document.body.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('Falha ao inicializar o motor PDF.js.');
        }

        // Configure the PDF.js Global Worker via a Blob URL to avoid same-origin restrictions
        try {
          const workerRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
          if (workerRes.ok) {
            const workerBlob = await workerRes.blob();
            const workerBlobUrl = URL.createObjectURL(workerBlob);
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;
          } else {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        } catch (workerErr) {
          console.warn('[DocumentViewer] Failed to load worker via blob fallback, using direct CDN URL:', workerErr);
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // 2. Prepare the PDF document source
        let pdfSource: any;
        const url = doc.downloadURL;

        if (url.startsWith('data:') && url.includes(';base64,')) {
          // Process local Base64 storage
          const base64Parts = url.split(';base64,');
          const base64Data = base64Parts[1];
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          pdfSource = { data: bytes };
        } else if (url.startsWith('https://') && !url.includes(window.location.host)) {
          // Process direct Firebase URL or other remote URL via our proxy
          pdfSource = { url: `/api/proxy-pdf?url=${encodeURIComponent(url)}` };
        } else {
          // Process local Blob URL or same origin URL
          pdfSource = { url: url };
        }

        // 3. Load the document
        const loadingTask = pdfjsLib.getDocument(pdfSource);
        const pdfDocument = await loadingTask.promise;

        if (isMounted) {
          setPdf(pdfDocument);
          setNumPages(pdfDocument.numPages);
          setPageNum(1);
          setPdfLoading(false);
        }
      } catch (err: any) {
        console.error('[DocumentViewer PDF.js] Error loading PDF:', err);
        if (isMounted) {
          setPdfError(err.message || 'Erro ao processar as páginas do arquivo PDF.');
          setPdfLoading(false);
        }
      }
    };

    loadPdfjsAndDocument();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [doc.downloadURL, isPdf]);

  // Render the current page onto the canvas
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let isMounted = true;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const page = await pdf.getPage(pageNum);
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('[DocumentViewer PDF.js] Error rendering page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
    };
  }, [pdf, pageNum, scale]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrevPage = () => {
    if (pageNum > 1) setPageNum(pageNum - 1);
  };

  const handleNextPage = () => {
    if (pageNum < numPages) setPageNum(pageNum + 1);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.75));
  };

  return (
    <div className="fixed inset-0 bg-sand-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="document-viewer-modal"
        className="bg-white rounded-3xl border border-sand-200/80 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        
        {/* 1. Header with Metadata */}
        <div className="p-5 border-b border-sand-100 flex items-center justify-between bg-sand-50/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-softblue-50 text-softblue-700 border border-softblue-100 rounded">
                {doc.category}
              </span>
              <span className="text-xs text-sand-400 font-mono">•</span>
              <span className="text-xs text-sand-500 font-mono truncate max-w-[150px] sm:max-w-xs">
                {doc.originalName}
              </span>
            </div>
            <h3 className="text-sm font-bold text-sand-950 font-serif truncate mt-1">
              {doc.fileName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-sand-100 text-sand-600 rounded-xl transition-colors cursor-pointer"
                title="Fazer Download"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-sand-100 text-sand-600 hover:text-sand-950 rounded-xl transition-colors cursor-pointer"
              title="Fechar Visualizador"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Primary Media Player / Viewport */}
        <div className="flex-1 bg-sand-950/20 p-6 overflow-y-auto flex items-center justify-center min-h-[300px]">
          {isImage ? (
            <div className="relative group max-w-full max-h-[50vh] rounded-xl overflow-hidden shadow-md">
              <img
                src={doc.downloadURL}
                alt={doc.fileName}
                referrerPolicy="no-referrer"
                className="max-h-[50vh] max-w-full object-contain rounded-xl"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full flex flex-col gap-4">
              {/* PDF Toolbar */}
              <div className="bg-sand-100/80 border border-sand-200/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                
                {/* Left controls: Pagination */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={pdfLoading || pageNum <= 1}
                    className="p-2 bg-white hover:bg-sand-50 disabled:opacity-40 border border-sand-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    title="Página Anterior"
                  >
                    <ChevronLeft size={16} className="text-sand-700" />
                  </button>
                  <span className="text-xs font-mono font-bold text-sand-800 bg-white border border-sand-200 px-3 py-2 rounded-xl shadow-sm">
                    {pdfLoading ? '...' : `Página ${pageNum} de ${numPages}`}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={pdfLoading || pageNum >= numPages}
                    className="p-2 bg-white hover:bg-sand-50 disabled:opacity-40 border border-sand-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    title="Próxima Página"
                  >
                    <ChevronRight size={16} className="text-sand-700" />
                  </button>
                </div>

                {/* Middle controls: Zoom */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={pdfLoading || scale <= 0.75}
                    className="p-2 bg-white hover:bg-sand-50 disabled:opacity-40 border border-sand-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut size={16} className="text-sand-700" />
                  </button>
                  <span className="text-xs font-mono font-bold text-sand-800 bg-white border border-sand-200 px-3 py-2 rounded-xl shadow-sm w-16 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={pdfLoading || scale >= 2.5}
                    className="p-2 bg-white hover:bg-sand-50 disabled:opacity-40 border border-sand-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn size={16} className="text-sand-700" />
                  </button>
                </div>

                {/* Right controls: Alternative opening */}
                <button
                  onClick={openPdfInNewTab}
                  className="px-4 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  title="Abrir em Nova Aba"
                >
                  <Paperclip size={14} />
                  <span>Abrir em Nova Guia</span>
                </button>

              </div>

              {/* PDF Content Viewport */}
              <div className="w-full flex justify-center bg-sand-900/10 border border-sand-200 rounded-2xl overflow-auto p-4 min-h-[400px] max-h-[55vh] custom-scrollbar">
                {pdfLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 size={36} className="text-softblue-600 animate-spin" />
                    <p className="text-xs font-bold font-serif text-sand-800 animate-pulse">
                      Carregando prontuário digital de forma segura...
                    </p>
                  </div>
                ) : pdfError ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-center p-8 bg-white rounded-2xl border border-rose-100 max-w-md my-auto shadow-sm">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-950 font-serif">Falha no Visualizador Integrado</h4>
                      <p className="text-[11px] text-rose-800 leading-normal mt-1">
                        {pdfError}. Por razões de privacidade e restrições do navegador, clique no botão abaixo para abrir o arquivo em ambiente externo seguro.
                      </p>
                    </div>
                    <button
                      onClick={openPdfInNewTab}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer animate-bounce mt-2"
                    >
                      <Paperclip size={14} />
                      <span>Visualizar em Nova Guia</span>
                    </button>
                  </div>
                ) : (
                  <div className="shadow-lg border border-sand-200 rounded-xl bg-white overflow-hidden p-0 h-fit">
                    <canvas ref={canvasRef} className="max-w-full block" />
                  </div>
                )}
              </div>
            </div>
          ) : isAudio ? (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-sand-200/60 max-w-md w-full text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-softblue-50 text-softblue-600 flex items-center justify-center mx-auto border border-softblue-100 animate-pulse">
                <Music size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-sand-500 uppercase">Reprodutor de Áudio Clínico</p>
                <p className="text-xs font-bold text-sand-900 truncate">{doc.fileName}</p>
              </div>
              <audio 
                src={doc.downloadURL} 
                controls 
                className="w-full"
                controlsList="nodownload"
              />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-md border border-sand-200/60 max-w-md text-center space-y-4">
              <div className="h-16 w-16 bg-sand-100 rounded-full flex items-center justify-center mx-auto text-sand-400">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-sand-950 font-serif">Visualização Indisponível</h4>
                <p className="text-xs text-sand-600 leading-relaxed">
                  Este arquivo ({doc.fileType}) não pode ser pré-visualizado diretamente no navegador. Por favor, faça o download para abri-lo localmente.
                </p>
              </div>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-sand-900 hover:bg-sand-950 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Baixar Arquivo</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Detailed File Metadata Sidebar/Footer */}
        <div className="p-5 border-t border-sand-100 bg-sand-50/40 text-xs text-sand-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-sand-400 uppercase font-mono tracking-wider block">
              Descrição Clínica
            </span>
            <p className="text-[11px] text-sand-800 font-mono italic leading-relaxed">
              {doc.description || 'Nenhuma descrição fornecida.'}
            </p>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider block">
              Histórico de Upload
            </span>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sand-600">
                <Calendar size={12} className="text-sand-400" />
                <span>Enviado em: {formatDate(doc.uploadedAt)}</span>
              </p>
              <p className="flex items-center gap-1.5 text-sand-600">
                <User size={12} className="text-sand-400" />
                <span>Por: {doc.uploadedBy}</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider block">
              Especificações Técnicas
            </span>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sand-600">
                <HardDrive size={12} className="text-sand-400" />
                <span>Tamanho: {formatSize(doc.fileSize)}</span>
              </p>
              <p className="flex items-center gap-1.5 text-sand-600">
                <Paperclip size={12} className="text-sand-400" />
                <span>Tipo MIME: {doc.fileType}</span>
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
