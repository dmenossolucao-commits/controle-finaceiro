import { Sparkles, RefreshCw, Upload, Trash2, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface FotosTabProps {
  siteContent: any;
  previewUrls: Record<string, string>;
  uploadProgress: Record<string, number>;
  uploadStatus: Record<string, string>;
  uploadLoading: Record<string, boolean>;
  handleConfirmImageUpload: (key: 'hero' | 'about' | 'logo') => void;
  handleCancelImageSelection: (key: 'hero' | 'about' | 'logo' | 'blog') => void;
  handleSelectImageForUpload: (key: 'hero' | 'about' | 'logo' | 'blog', file: File) => void;
  handleClearImage: (key: 'hero' | 'about' | 'logo') => void;
}

export default function FotosTab({
  siteContent,
  previewUrls,
  uploadProgress,
  uploadStatus,
  uploadLoading,
  handleConfirmImageUpload,
  handleCancelImageSelection,
  handleSelectImageForUpload,
  handleClearImage
}: FotosTabProps) {
  return (
    <motion.div
      key="tab-fotos"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="bg-dusty-50/50 rounded-2xl p-6 border border-dusty-100 max-w-4xl">
        <h3 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
          <Sparkles size={16} className="text-dusty-600" /> Galeria de Imagens & Fotos Clínicas
        </h3>
        <p className="text-xs text-sand-700 leading-relaxed mt-1">
          As fotos do site são armazenadas com segurança no Firebase Storage. Selecione uma nova foto para visualizar uma prévia local. Após confirmar, o arquivo será enviado ao Storage e a URL pública será atualizada no banco de dados Firestore, refletindo instantaneamente na Landing Page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { key: 'hero', label: 'Foto Principal (Hero)', section: 'Topo da Página', url: siteContent.psychologist_info.heroImageUrl, desc: 'Exibida na abertura do site.' },
          { key: 'about', label: 'Foto da Biografia', section: 'Seção Sobre Mim', url: siteContent.psychologist_info.aboutImageUrl, desc: 'Apresentação profissional e retrato.' },
          { key: 'logo', label: 'Logotipo Oficial', section: 'Identidade Visual', url: siteContent.psychologist_info.logoUrl, desc: 'Exibido no cabeçalho/navbar.', objectFit: 'object-contain' }
        ].map((imgItem) => {
          const hasLocalPreview = !!previewUrls[imgItem.key];
          const displayUrl = previewUrls[imgItem.key] || imgItem.url;
          const progress = uploadProgress[imgItem.key] || 0;
          const statusText = uploadStatus[imgItem.key] || '';
          const isLoading = !!uploadLoading[imgItem.key];

          return (
            <div key={imgItem.key} className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex flex-col justify-between space-y-4 relative">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase text-sand-500 bg-sand-100 px-2 py-0.5 rounded">{imgItem.section}</span>
                  {hasLocalPreview && (
                    <span className="text-[9px] font-mono font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded animate-pulse">Prévia</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-sand-950 mt-2 font-serif">{imgItem.label}</h4>
                <p className="text-[11px] text-sand-500 mt-1">{imgItem.desc}</p>
              </div>

              <div className="aspect-[4/5] w-full rounded-xl bg-sand-50/50 border border-dashed border-sand-200 overflow-hidden relative flex items-center justify-center p-2.5">
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={imgItem.label}
                    className={`w-full h-full rounded-lg ${imgItem.objectFit || 'object-cover'} transition-all`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] font-mono text-sand-400">Nenhuma imagem personalizada</span>
                )}

                {isLoading && (
                  <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4 space-y-2">
                    <RefreshCw className="animate-spin text-dusty-600" size={24} />
                    <span className="text-[10px] font-bold text-sand-700 font-mono">{progress}%</span>
                    <div className="w-24 bg-sand-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-dusty-600 h-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {statusText && (
                  <div className={`p-2 rounded-lg text-center text-[10px] font-bold uppercase font-mono border ${
                    statusText.includes('sucesso') 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : statusText.includes('Erro') || statusText.includes('Falha')
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-sand-50 border-sand-200 text-sand-800'
                  }`}>
                    {statusText}
                  </div>
                )}

                {/* Progress bar displayed below if loaded outside overlay */}
                {!isLoading && progress > 0 && progress < 100 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-sand-500 font-mono">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-sand-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-dusty-600 h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  {hasLocalPreview ? (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleConfirmImageUpload(imgItem.key as any)}
                        disabled={isLoading}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Save size={12} />
                        <span>Confirmar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelImageSelection(imgItem.key as any)}
                        disabled={isLoading}
                        className="py-2 px-3 bg-sand-100 hover:bg-sand-200 disabled:opacity-50 text-sand-700 rounded-xl text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-sand-200"
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="flex-1 py-2 bg-dusty-600 hover:bg-dusty-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                        <Upload size={12} />
                        <span>Selecionar</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleSelectImageForUpload(imgItem.key as any, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {imgItem.url && (
                        <button
                          type="button"
                          onClick={() => handleClearImage(imgItem.key as any)}
                          className="p-2 border border-sand-200 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer"
                          title="Remover Imagem"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
