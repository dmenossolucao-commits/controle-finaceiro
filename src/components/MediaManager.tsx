import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, Save, RefreshCw, CheckCircle2, AlertCircle, 
  Trash2, Copy, Sparkles, Image as ImageIcon, Link as LinkIcon,
  X, Calendar, Eye
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContext';
import { contentService } from '../services/contentService';
import { db, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { 
  collection, doc, getDocs, addDoc, deleteDoc, updateDoc 
} from 'firebase/firestore';

interface MediaManagerProps {
  user: any;
  dbAdminDoc: any;
  setDbAdminDoc: React.Dispatch<React.SetStateAction<any>>;
}

interface BlogImageItem {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
}

export default function MediaManager({ user, dbAdminDoc, setDbAdminDoc }: MediaManagerProps) {
  const { siteContent, updateSiteContent } = useSiteContent();

  // Individual states for each media category to prevent full-screen or unrelated re-renders
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadLoading, setUploadLoading] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Blog images collection states
  const [blogImages, setBlogImages] = useState<BlogImageItem[]>([]);
  const [loadingBlogImages, setLoadingBlogImages] = useState(false);

  // Full-screen image lightbox state
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

  // Persistence of upload dates for system images
  const [uploadDates, setUploadDates] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mente_care_upload_dates');
      return saved ? JSON.parse(saved) : {
        hero: '14/07/2026, 14:32',
        about: '14/07/2026, 14:35',
        logo: '15/07/2026, 11:20',
        favicon: '15/07/2026, 11:21',
        admin: '16/07/2026, 09:15'
      };
    } catch {
      return {};
    }
  });

  // Load blog images on mount
  useEffect(() => {
    loadBlogImages();
  }, []);

  const loadBlogImages = async () => {
    setLoadingBlogImages(true);
    try {
      const snap = await getDocs(collection(db, 'blog_images'));
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as BlogImageItem[];
      
      // Sort by uploadedAt descending
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setBlogImages(list);
    } catch (err) {
      console.error("Erro ao carregar imagens do blog:", err);
    } finally {
      setLoadingBlogImages(false);
    }
  };

  const handleSelectFile = (key: string, file: File) => {
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedFiles(prev => ({ ...prev, [key]: file }));
    setPreviewUrls(prev => ({ ...prev, [key]: previewUrl }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    setUploadStatus(prev => ({ ...prev, [key]: '' }));
  };

  const handleCancelSelection = (key: string) => {
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
    }
    setSelectedFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPreviewUrls(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    setUploadStatus(prev => ({ ...prev, [key]: '' }));
  };

  const handleConfirmUpload = async (key: 'hero' | 'about' | 'logo' | 'favicon' | 'admin' | 'blog_assets') => {
    const file = selectedFiles[key];
    if (!file) return;

    setUploadLoading(prev => ({ ...prev, [key]: true }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    setUploadStatus(prev => ({ ...prev, [key]: 'Iniciando envio...' }));

    try {
      // Determine folder path in Storage
      const folder = key === 'admin' ? 'admins' : (key === 'blog_assets' ? 'blog' : 'site');
      
      const url = await contentService.uploadImage(file, folder, (progress, status) => {
        setUploadProgress(prev => ({ ...prev, [key]: progress }));
        setUploadStatus(prev => ({ ...prev, [key]: status || `Enviando arquivo: ${progress}%` }));
      });

      // Update database accordingly
      if (key === 'hero') {
        const oldUrl = siteContent.psychologist_info.heroImageUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            heroImageUrl: url
          }
        });
        if (oldUrl) await contentService.deleteImage(oldUrl);
      } 
      else if (key === 'about') {
        const oldUrl = siteContent.psychologist_info.aboutImageUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            aboutImageUrl: url
          }
        });
        if (oldUrl) await contentService.deleteImage(oldUrl);
      } 
      else if (key === 'logo') {
        const oldUrl = siteContent.psychologist_info.logoUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            logoUrl: url
          },
          appearance: {
            ...siteContent.appearance,
            logoUrl: url
          }
        });
        if (oldUrl) await contentService.deleteImage(oldUrl);
      } 
      else if (key === 'favicon') {
        const oldUrl = (siteContent.appearance as any).faviconUrl || '';
        await updateSiteContent({
          appearance: {
            ...siteContent.appearance,
            faviconUrl: url
          } as any,
          psychologist_info: {
            ...siteContent.psychologist_info,
            faviconUrl: url
          } as any
        });
        if (oldUrl) await contentService.deleteImage(oldUrl);
      } 
      else if (key === 'admin') {
        const oldUrl = dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL || '';
        
        // Update user Auth profile photo URL
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: url });
        }

        // Update Firestore admin doc
        const adminUidRef = doc(db, 'admins', user.uid);
        await updateDoc(adminUidRef, { photoURL: url, photoUrl: url });
        try {
          const adminEmailRef = doc(db, 'admins', user.email || '');
          await updateDoc(adminEmailRef, { photoURL: url, photoUrl: url });
        } catch (e) {}

        setDbAdminDoc(prev => ({ ...prev, photoURL: url, photoUrl: url }));
        if (oldUrl) await contentService.deleteImage(oldUrl);
      } 
      else if (key === 'blog_assets') {
        // Save uploaded blog image metadata to Firestore
        await addDoc(collection(db, 'blog_images'), {
          url,
          name: file.name,
          uploadedAt: new Date().toISOString()
        });
        await loadBlogImages();
      }

      setUploadStatus(prev => ({ ...prev, [key]: 'Sucesso! Salvo com sucesso.' }));
      setUploadProgress(prev => ({ ...prev, [key]: 100 }));

      // Update stored upload date
      const nowStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      setUploadDates(prev => {
        const next = { ...prev, [key]: nowStr };
        localStorage.setItem('mente_care_upload_dates', JSON.stringify(next));
        return next;
      });

      // Revoke and clear preview state
      setTimeout(() => {
        handleCancelSelection(key);
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setUploadStatus(prev => ({ ...prev, [key]: `Erro: ${err.message || 'Falha no envio.'}` }));
    } finally {
      setUploadLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDeleteBlogImage = async (item: BlogImageItem) => {
    if (!window.confirm("Deseja realmente excluir esta imagem do blog? Ela não estará mais acessível nos seus artigos.")) return;
    try {
      await contentService.deleteImage(item.url);
      await deleteDoc(doc(db, 'blog_images', item.id));
      setBlogImages(prev => prev.filter(img => img.id !== item.id));
    } catch (err) {
      console.error("Erro ao deletar imagem do blog:", err);
      alert("Erro ao excluir imagem.");
    }
  };

  // Delete system image and update state immediately
  const handleDeleteSystemImage = async (key: 'hero' | 'about' | 'logo' | 'favicon' | 'admin') => {
    if (!window.confirm("Tem certeza que deseja excluir esta imagem? Ela será removida definitivamente.")) return;
    
    setUploadLoading(prev => ({ ...prev, [key]: true }));
    setUploadStatus(prev => ({ ...prev, [key]: 'Removendo...' }));

    try {
      let oldUrl = '';
      if (key === 'hero') {
        oldUrl = siteContent.psychologist_info.heroImageUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            heroImageUrl: ''
          }
        });
      } else if (key === 'about') {
        oldUrl = siteContent.psychologist_info.aboutImageUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            aboutImageUrl: ''
          }
        });
      } else if (key === 'logo') {
        oldUrl = siteContent.psychologist_info.logoUrl || '';
        await updateSiteContent({
          psychologist_info: {
            ...siteContent.psychologist_info,
            logoUrl: ''
          },
          appearance: {
            ...siteContent.appearance,
            logoUrl: ''
          }
        });
      } else if (key === 'favicon') {
        oldUrl = (siteContent.appearance as any).faviconUrl || '';
        await updateSiteContent({
          appearance: {
            ...siteContent.appearance,
            faviconUrl: ''
          } as any,
          psychologist_info: {
            ...siteContent.psychologist_info,
            faviconUrl: ''
          } as any
        });
      } else if (key === 'admin') {
        oldUrl = dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL || '';
        
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: '' });
        }
        const adminUidRef = doc(db, 'admins', user.uid);
        await updateDoc(adminUidRef, { photoURL: '', photoUrl: '' });
        try {
          const adminEmailRef = doc(db, 'admins', user.email || '');
          await updateDoc(adminEmailRef, { photoURL: '', photoUrl: '' });
        } catch (e) {}

        setDbAdminDoc(prev => ({ ...prev, photoURL: '', photoUrl: '' }));
      }

      if (oldUrl) {
        await contentService.deleteImage(oldUrl);
      }

      setUploadStatus(prev => ({ ...prev, [key]: 'Sucesso! Removido com sucesso.' }));
      setUploadProgress(prev => ({ ...prev, [key]: 0 }));
      
      // Update saved dates
      setUploadDates(prev => {
        const next = { ...prev };
        delete next[key];
        localStorage.setItem('mente_care_upload_dates', JSON.stringify(next));
        return next;
      });

      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [key]: '' }));
      }, 3000);

    } catch (err: any) {
      console.error("Erro ao excluir imagem:", err);
      setUploadStatus(prev => ({ ...prev, [key]: `Erro: ${err.message || 'Falha ao remover.'}` }));
    } finally {
      setUploadLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => {
      setCopiedUrlId(null);
    }, 2000);
  };

  const systemImagesList = [
    {
      key: 'hero',
      label: 'Foto do Banner Principal (Hero)',
      section: 'Topo do Site',
      url: siteContent.psychologist_info.heroImageUrl,
      desc: 'Imagem de abertura que representa a clínica ou a terapeuta.'
    },
    {
      key: 'about',
      label: 'Foto da Seção Sobre Mim',
      section: 'Apresentação Biográfica',
      url: siteContent.psychologist_info.aboutImageUrl,
      desc: 'Sua foto ou retrato exibido ao lado da sua biografia e CRP.'
    },
    {
      key: 'logo',
      label: 'Logotipo Oficial da Clínica',
      section: 'Cabeçalho e Rodapé',
      url: siteContent.psychologist_info.logoUrl,
      desc: 'Imagem da logo usada na navegação superior e rodapé do site.',
      objectFit: 'object-contain'
    },
    {
      key: 'favicon',
      label: 'Favicon do Navegador',
      section: 'Ícone da Aba do Navegador',
      url: (siteContent.appearance as any).faviconUrl || siteContent.psychologist_info.logoUrl,
      desc: 'O pequeno ícone exibido na aba do navegador do visitante.',
      objectFit: 'object-contain'
    },
    {
      key: 'admin',
      label: 'Foto de Perfil do Administrador',
      section: 'Sua Conta no Painel',
      url: dbAdminDoc?.photoUrl || dbAdminDoc?.photoURL || user?.photoURL,
      desc: 'Exibida no canto inferior do menu lateral do painel administrativo.'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Introduction Card */}
      <div className="bg-white p-8 rounded-3xl border border-sand-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-sand-950 flex items-center gap-2">
            <ImageIcon className="text-softblue-500" size={22} />
            Módulo Exclusivo de Mídia
          </h3>
          <p className="text-xs text-sand-600 mt-1.5 leading-relaxed max-w-2xl">
            Gerencie todas as imagens e logotipos utilizados na sua clínica e portal.
            Cada upload é processado de forma isolada, impedindo nova renderização total da página e salvando automaticamente as novas credenciais direto na nuvem.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-softblue-50 rounded-xl border border-softblue-100 text-[10px] text-softblue-800 font-bold font-mono uppercase tracking-wider self-start md:self-auto">
          ● Armazenamento Ativo
        </div>
      </div>

      {/* Main Grid for 5 System Images */}
      <div>
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand-500 mb-4 flex items-center gap-1.5">
          <Sparkles size={13} />
          Imagens e Identidade do Site
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systemImagesList.map((item) => {
            const hasPreview = !!previewUrls[item.key];
            const currentUrl = previewUrls[item.key] || item.url;
            const progress = uploadProgress[item.key] || 0;
            const status = uploadStatus[item.key] || '';
            const loading = !!uploadLoading[item.key];

            return (
              <div 
                key={item.key} 
                className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm flex flex-col justify-between space-y-4"
              >
                {/* Section tag & title */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold uppercase bg-sand-100 text-sand-600 px-2 py-0.5 rounded">
                      {item.section}
                    </span>
                    {hasPreview ? (
                      <span className="text-[9px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded animate-pulse">
                        Prévia Local
                      </span>
                    ) : (
                      uploadDates[item.key] && (
                        <span className="text-[9px] font-mono text-sand-500 flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{uploadDates[item.key]}</span>
                        </span>
                      )
                    )}
                  </div>
                  <h5 className="font-serif font-bold text-sm text-sand-950 mt-3">{item.label}</h5>
                  <p className="text-[11px] text-sand-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>

                {/* Preview Container */}
                <div className="aspect-video w-full rounded-2xl bg-sand-50 border border-dashed border-sand-200 overflow-hidden relative flex items-center justify-center p-2 group">
                  {currentUrl ? (
                    <>
                      <img
                        src={currentUrl}
                        alt={item.label}
                        className={`w-full h-full rounded-xl ${item.objectFit || 'object-cover'} transition-all`}
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Hover Fullscreen trigger overlay */}
                      <div 
                        onClick={() => setFullscreenImage({ url: currentUrl, title: item.label })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer text-white"
                      >
                        <Eye size={16} />
                        <span className="text-xs font-bold font-mono uppercase tracking-wider">Ampliar</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="text-sand-300 mx-auto mb-1.5" size={24} />
                      <span className="text-[10px] font-mono text-sand-400">Sem imagem configurada</span>
                    </div>
                  )}

                  {/* Progress Overlay */}
                  {loading && (
                    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 space-y-2.5">
                      <RefreshCw className="animate-spin text-softblue-500" size={24} />
                      <span className="text-[10px] font-bold text-sand-700 font-mono">{progress}%</span>
                      <div className="w-28 bg-sand-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-softblue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and Action Buttons */}
                <div className="space-y-3 pt-1">
                  {status && (
                    <div className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase font-mono text-center flex items-center justify-center gap-1.5 ${
                      status.includes('Sucesso') 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : status.includes('Erro')
                          ? 'bg-rose-50 border-rose-100 text-rose-800'
                          : 'bg-sand-50 border-sand-100 text-sand-700'
                    }`}>
                      {status.includes('Sucesso') && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                      {status.includes('Erro') && <AlertCircle size={12} className="text-rose-600 shrink-0" />}
                      {!status.includes('Sucesso') && !status.includes('Erro') && <RefreshCw size={11} className="animate-spin text-sand-500 shrink-0" />}
                      <span className="truncate">{status}</span>
                    </div>
                  )}

                  {hasPreview ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmUpload(item.key as any)}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Save size={13} />
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelSelection(item.key)}
                        disabled={loading}
                        className="py-2.5 px-3.5 bg-sand-100 hover:bg-sand-200 text-sand-700 rounded-xl text-xs font-bold uppercase border border-sand-200 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="flex-1 py-2.5 bg-softblue-500 hover:bg-softblue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer">
                        <Upload size={13} />
                        <span>{item.url ? 'Substituir' : 'Selecionar'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSelectFile(item.key, file);
                          }}
                        />
                      </label>
                      
                      {item.url && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSystemImage(item.key as any)}
                          disabled={loading}
                          className="p-2.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer transition-colors"
                          title="Excluir Imagem"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclusivo Módulo: Imagens do Blog */}
      <div className="border-t border-sand-200/60 pt-8">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand-500 mb-4 flex items-center gap-1.5">
          <Sparkles size={13} />
          Imagens do Blog & Artigos
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Blog Uploader Card */}
          <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-4 lg:col-span-1 self-start">
            <h5 className="font-serif font-bold text-sm text-sand-950">Novo Upload para o Blog</h5>
            <p className="text-xs text-sand-500 leading-relaxed">
              Faça upload de fotos para ilustrar seus artigos. Após o envio, copie a URL pública para colá-la na caixa de imagem do post ou direto no texto Markdown.
            </p>

            <div className="aspect-video w-full rounded-2xl bg-sand-50 border border-dashed border-sand-200 overflow-hidden relative flex items-center justify-center p-2">
              {previewUrls['blog_assets'] ? (
                <img
                  src={previewUrls['blog_assets']}
                  alt="Blog preview"
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Upload className="text-sand-300 mx-auto mb-2" size={28} />
                  <span className="text-[10px] font-mono text-sand-400">Nenhum arquivo selecionado</span>
                </div>
              )}

              {uploadLoading['blog_assets'] && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 space-y-2">
                  <RefreshCw className="animate-spin text-softblue-500" size={24} />
                  <span className="text-[10px] font-bold text-sand-700 font-mono">{uploadProgress['blog_assets']}%</span>
                  <div className="w-24 bg-sand-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-softblue-500 h-full transition-all duration-300" style={{ width: `${uploadProgress['blog_assets']}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {uploadStatus['blog_assets'] && (
                <div className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase font-mono text-center flex items-center justify-center gap-1.5 ${
                  uploadStatus['blog_assets'].includes('Sucesso') 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : uploadStatus['blog_assets'].includes('Erro')
                      ? 'bg-rose-50 border-rose-100 text-rose-800'
                      : 'bg-sand-50 border-sand-100 text-sand-700'
                }`}>
                  {uploadStatus['blog_assets'].includes('Sucesso') && <CheckCircle2 size={12} className="text-emerald-600" />}
                  {uploadStatus['blog_assets'].includes('Erro') && <AlertCircle size={12} className="text-rose-600" />}
                  <span>{uploadStatus['blog_assets']}</span>
                </div>
              )}

              {previewUrls['blog_assets'] ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmUpload('blog_assets')}
                    disabled={uploadLoading['blog_assets']}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save size={13} />
                    <span>Enviar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelSelection('blog_assets')}
                    disabled={uploadLoading['blog_assets']}
                    className="py-2.5 px-3.5 bg-sand-100 hover:bg-sand-200 text-sand-700 rounded-xl text-xs font-bold uppercase border border-sand-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <label className="w-full py-2.5 bg-softblue-500 hover:bg-softblue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer">
                  <Upload size={13} />
                  <span>Selecionar Imagem</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelectFile('blog_assets', file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Blog Images Gallery */}
          <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm lg:col-span-2 space-y-4">
            <h5 className="font-serif font-bold text-sm text-sand-950">Galeria de Imagens do Blog</h5>

            {loadingBlogImages ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <RefreshCw className="animate-spin text-sand-400" size={24} />
                <span className="text-xs font-mono text-sand-500">Buscando imagens...</span>
              </div>
            ) : blogImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sand-400">
                <ImageIcon className="text-sand-200 mb-2" size={36} />
                <p className="text-xs">Nenhuma imagem enviada ainda para o blog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {blogImages.map((img) => (
                  <div 
                    key={img.id} 
                    className="group relative bg-sand-50 rounded-2xl border border-sand-200 overflow-hidden flex flex-col justify-between p-2 space-y-2"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-sand-200 relative">
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-sand-700 font-medium truncate" title={img.name}>
                        {img.name}
                      </p>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCopyUrl(img.url, img.id)}
                          className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold uppercase font-mono flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            copiedUrlId === img.id 
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                              : 'bg-white hover:bg-sand-100 border border-sand-300 text-sand-700'
                          }`}
                        >
                          {copiedUrlId === img.id ? (
                            <>
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteBlogImage(img)}
                          className="p-1 border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="Excluir Imagem"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Immersive Lightbox Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-all"
          >
            <X size={20} />
          </button>
          
          <img 
            src={fullscreenImage.url} 
            alt={fullscreenImage.title} 
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-[1.01]"
            referrerPolicy="no-referrer"
          />
          
          <div className="mt-4 text-center">
            <h5 className="text-white text-sm font-medium">{fullscreenImage.title}</h5>
            <p className="text-sand-400 text-xs mt-1">Clique em qualquer lugar para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
