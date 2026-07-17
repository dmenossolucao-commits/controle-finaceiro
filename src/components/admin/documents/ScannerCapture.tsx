import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, RotateCw, Crop, Sun, Check, X, ShieldAlert, Image, FileText, Settings, Loader2 } from 'lucide-react';
import { Patient } from '../../../types';
import { contentService } from '../../../services/contentService';
import { jsPDF } from 'jspdf';

interface ScannerCaptureProps {
  patient: Patient;
  onDocumentCaptured: (doc: any) => void;
  onClose: () => void;
}

export const ScannerCapture: React.FC<ScannerCaptureProps> = ({
  patient,
  onDocumentCaptured,
  onClose,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100); // 0-200%
  const [contrast, setContrast] = useState(100); // 0-200%
  const [cropBorders, setCropBorders] = useState(false); // real edge crop
  const [autoPDF, setAutoPDF] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scannerMode, setScannerMode] = useState<'camera' | 'preview'>('camera');
  const [docName, setDocName] = useState(`Scanner_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setCapturedImage(null);
    setScannerMode('camera');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Rear camera preferred
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Não foi possível acessar a câmera. Você pode selecionar um arquivo da galeria como alternativa.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture Photo from Video Stream
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Setup canvas dimensions matching video frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw standard frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      setScannerMode('preview');
      stopCamera();
    }
  };

  // Handle Rotation (90deg steps)
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Handle local File fallback
  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
          setDocName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
          setScannerMode('preview');
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger fallback upload
  const triggerFallbackSelect = () => {
    fileInputRef.current?.click();
  };

  // Apply Rotation/Filters and Save
  const handleSave = async () => {
    if (!capturedImage) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Create offscreen canvas to apply final transforms
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      const img = new Image();

      img.src = capturedImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      setUploadProgress(30);

      // Define real source coordinates (crop borders if enabled)
      let srcX = 0;
      let srcY = 0;
      let srcW = img.width;
      let srcH = img.height;

      if (cropBorders) {
        // Crop 6% from each edge
        const borderX = img.width * 0.06;
        const borderY = img.height * 0.06;
        srcX = borderX;
        srcY = borderY;
        srcW = img.width - (borderX * 2);
        srcH = img.height - (borderY * 2);
      }

      // Setup output canvas dimensions based on final orientation/rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      tempCanvas.width = isRotated90or270 ? srcH : srcW;
      tempCanvas.height = isRotated90or270 ? srcW : srcH;

      if (ctx) {
        // Clear canvas cleanly
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 1. Apply visual enhancements directly to Canvas 2D Context before drawing!
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        // 2. Translate and rotate about the center
        ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // 3. Draw cropped source coordinates centered onto rotated context
        ctx.drawImage(
          img,
          srcX, srcY, srcW, srcH, // Crop source
          -srcW / 2, -srcH / 2, srcW, srcH // Rotated destination
        );
      }

      setUploadProgress(50);

      // Convert canvas output to JPEG Blob
      tempCanvas.toBlob(async (jpegBlob) => {
        if (!jpegBlob) {
          throw new Error('Falha ao processar imagem capturada.');
        }

        let finalBlob: Blob = jpegBlob;
        let finalFormat = 'jpg';
        let finalMime = 'image/jpeg';

        if (autoPDF) {
          try {
            // Generate a real, properly scaled client-side PDF document using jsPDF!
            const pdf = new jsPDF({
              orientation: tempCanvas.width > tempCanvas.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [tempCanvas.width, tempCanvas.height]
            });

            // Convert canvas to a high-quality JPEG data URL
            const jpegDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
            pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, tempCanvas.width, tempCanvas.height);

            // Output as a standard PDF blob
            const pdfBlob = pdf.output('blob');
            finalBlob = pdfBlob;
            finalFormat = 'pdf';
            finalMime = 'application/pdf';
            console.log(`[Scanner PDF Generator] Real PDF created successfully. Size: ${finalBlob.size} bytes`);
          } catch (pdfErr) {
            console.error('[Scanner PDF Generator] Error converting to real PDF, using image fallback:', pdfErr);
          }
        }

        const finalFileName = `${docName}.${finalFormat}`;
        const category = 'Exames';

        // Upload to storage under the patients collection folder
        const uploadResult = await contentService.uploadDocumentFile(
          patient.id,
          finalBlob,
          finalFileName,
          (progress) => {
            setUploadProgress(50 + Math.round(progress / 2));
          }
        );

        // Write meta document data to patient_documents in Firestore
        const savedDoc = await contentService.createPatientDocument({
          patientId: patient.id,
          category,
          fileName: finalFileName,
          originalName: finalFileName,
          storagePath: uploadResult.storagePath,
          downloadURL: uploadResult.downloadURL,
          fileType: finalMime,
          fileSize: finalBlob.size,
          uploadedBy: 'Psicóloga Erica Costa',
          description: `Documento escaneado usando Scanner Clínico - ${autoPDF ? 'PDF gerado nativamente' : 'Imagem de alta definição'}.`,
          tags: ['Scanner', autoPDF ? 'PDF' : 'JPEG'],
          linkedRecordIds: []
        });

        setUploading(false);
        onDocumentCaptured(savedDoc);
      }, 'image/jpeg', 0.9);

    } catch (err: any) {
      console.error('Error saving scanned doc:', err);
      if (err.message && err.message.includes('Firebase Storage')) {
        alert(err.message);
      } else {
        alert('Erro ao processar e salvar documento.');
      }
      setUploading(false);
    }
  };

  return (
    <div className="bg-sand-900 text-white rounded-3xl overflow-hidden shadow-2xl relative border border-sand-800">
      
      {/* 1. Header Area */}
      <div className="p-4 border-b border-sand-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sand-300">
            Scanner Clínico Inteligente
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-sand-800 rounded-lg text-sand-400 hover:text-white cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. Interactive Capture / Preview Viewport */}
      <div className="aspect-[4/3] w-full bg-black relative flex items-center justify-center overflow-hidden">
        {scannerMode === 'camera' && (
          <>
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-6 text-center space-y-4 max-w-sm">
                <ShieldAlert size={32} className="text-amber-500 mx-auto" />
                <p className="text-xs text-sand-300 font-mono uppercase">Câmera Inativa</p>
                <p className="text-xs text-sand-400 leading-relaxed">
                  {cameraError || 'Aguardando autorização ou carregando câmera do dispositivo...'}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                  <button
                    onClick={triggerFallbackSelect}
                    className="px-4 py-2 border border-sand-700 hover:bg-sand-800 text-sand-300 rounded-xl text-xs font-bold font-mono uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Image size={14} />
                    <span>Selecionar da Galeria</span>
                  </button>
                </div>
              </div>
            )}

            {/* Target bounds guide for mobile documents */}
            {isCameraActive && (
              <div className="absolute inset-6 border-2 border-dashed border-white/45 pointer-events-none rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-mono uppercase text-white/50 bg-black/60 px-2.5 py-1 rounded-full">
                  Alinhe o documento aqui
                </span>
              </div>
            )}
          </>
        )}

        {scannerMode === 'preview' && capturedImage && (
          <div className="relative w-full h-full flex items-center justify-center p-4 bg-sand-950 overflow-hidden">
            {/* Visual preview with live transforms and CSS clipping for edge crop simulation */}
            <div 
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
                clipPath: cropBorders ? 'inset(6%)' : 'none'
              }}
              className="max-h-full max-w-full flex items-center justify-center transition-all duration-150"
            >
              <img
                src={capturedImage}
                alt="Scan Preview"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`
                }}
                className="max-h-full max-w-full object-contain shadow-xl rounded"
              />
            </div>
          </div>
        )}

        {/* Hidden canvas for taking pictures */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden file input for file selection fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileFallback}
          className="hidden"
        />

        {/* Overlay uploader loader */}
        {uploading && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-6 space-y-3 z-30">
            <Loader2 className="animate-spin text-softblue-500" size={32} />
            <span className="text-xs font-bold font-mono text-white">Processando Documento...</span>
            <div className="w-full max-w-xs h-1.5 bg-sand-850 rounded-full overflow-hidden">
              <div 
                className="bg-softblue-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-sand-400">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* 3. Controls Area */}
      <div className="p-5 bg-sand-950 border-t border-sand-800 space-y-4">
        {scannerMode === 'camera' && isCameraActive && (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={triggerFallbackSelect}
              className="p-3 bg-sand-900 hover:bg-sand-800 text-sand-300 rounded-2xl flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer font-mono"
              title="Carregar Imagem"
            >
              <Image size={16} />
            </button>

            <button
              onClick={handleCapture}
              className="h-14 w-14 rounded-full bg-white text-sand-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg border-4 border-sand-700"
              title="Fotografar"
            >
              <Camera size={24} />
            </button>

            <button
              onClick={triggerFallbackSelect}
              className="p-3 bg-sand-900 hover:bg-sand-800 text-sand-300 rounded-2xl flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer font-mono"
              title="Galeria"
            >
              <FileText size={16} />
            </button>
          </div>
        )}

        {scannerMode === 'preview' && capturedImage && (
          <div className="space-y-4">
            
            {/* Visual Adjustments Panel (Prepared) */}
            <div className="bg-sand-900/60 p-4 rounded-2xl border border-sand-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-sand-400 uppercase font-mono tracking-wider flex items-center gap-1">
                  <Settings size={10} />
                  <span>Ajustes & Pós-Processamento</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-500 font-mono uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                  Estrutura Ativa
                </span>
              </div>

              {/* Document Name input */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono text-sand-400 uppercase">Nome do Documento</span>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-sand-950 border border-sand-800 p-2 rounded-xl text-xs font-mono focus:outline-none focus:border-softblue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-sand-400">
                    <span>Brilho</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-softblue-500 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-sand-400">
                    <span>Contraste</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-softblue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* PDF Converter Switch */}
              <div className="flex items-center justify-between border-t border-sand-850/60 pt-2 text-[10px] font-mono">
                <span className="text-sand-300">Converter para PDF automaticamente</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPDF}
                    onChange={(e) => setAutoPDF(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-sand-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sand-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-softblue-500"></div>
                </label>
              </div>

              {/* Crop Borders Switch */}
              <div className="flex items-center justify-between border-t border-sand-850/60 pt-2 text-[10px] font-mono">
                <span className="text-sand-300 flex items-center gap-1">
                  <Crop size={11} className="text-softblue-400" />
                  <span>Recortar bordas das margens (6%)</span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cropBorders}
                    onChange={(e) => setCropBorders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-sand-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sand-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-softblue-500"></div>
                </label>
              </div>
            </div>

            {/* Rotation and Saving buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={startCamera}
                className="flex-1 py-2.5 bg-sand-900 hover:bg-sand-800 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Descartar</span>
              </button>

              <button
                onClick={handleRotate}
                className="p-2.5 bg-sand-900 hover:bg-sand-800 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Girar 90°"
              >
                <RotateCw size={14} />
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check size={13} />
                <span>Salvar na Pasta</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
