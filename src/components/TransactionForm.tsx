import React, { useState, useRef, useEffect } from 'react';
import { Category, FlowType, Transaction, ReceiptParseResult, PaymentMethod } from '../types';
import { LucideIcon } from './Icon';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onAddCategoryClick?: () => void;
  defaultFlowType?: FlowType;
  lastAddedCategoryId?: string | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  onSubmit,
  onAddCategoryClick,
  defaultFlowType = 'pessoal',
  lastAddedCategoryId
}) => {
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [flowType, setFlowType] = useState<FlowType>(defaultFlowType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  
  // Receipt parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync flowType with default when tab changes
  useEffect(() => {
    setFlowType(defaultFlowType);
  }, [defaultFlowType]);

  // Filter categories based on flowType
  const filteredCategories = categories.filter(cat => 
    cat.flowType === 'ambas' || cat.flowType === flowType
  );

  // Auto-set category if current choice becomes invalid
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const isValid = filteredCategories.some(c => c.id === categoryId);
      if (!isValid) {
        setCategoryId(filteredCategories[0].id);
      }
    } else {
      setCategoryId('');
    }
  }, [flowType, categories, filteredCategories]);

  // Auto-select newly added category and sync flowType
  useEffect(() => {
    if (lastAddedCategoryId) {
      const addedCat = categories.find(c => c.id === lastAddedCategoryId);
      if (addedCat) {
        if (addedCat.flowType !== 'ambas' && addedCat.flowType !== flowType) {
          setFlowType(addedCat.flowType);
        }
        setCategoryId(lastAddedCategoryId);
      }
    }
  }, [lastAddedCategoryId, categories]);

  // Handle manual form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await onSubmit({
        title,
        amount: parsedAmount,
        date,
        type,
        flowType,
        categoryId,
        notes: notes.trim() || undefined,
        receiptName: parsedFileName || undefined,
        paymentMethod,
        isClosed: false
      });

      // Reset form (except date and flow types for continuous input)
      setTitle('');
      setAmount('');
      setNotes('');
      setParsedFileName(null);
      setParseConfidence(null);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage('Erro ao salvar transação: ' + err.message);
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle uploader drop/change
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Allowed mime types
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Formato inválido. Envie um arquivo PDF ou imagem (PNG, JPG, WEBP).');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setParsedFileName(file.name);
    
    try {
      setParsingStep('Lendo arquivo do seu dispositivo...');
      const base64Data = await fileToBase64(file);
      
      setParsingStep('Conectando ao assistente Gemini AI...');
      const categoriesList = categories.map(c => c.name);

      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: file.type,
          fileName: file.name,
          existingCategories: categoriesList
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || errJson.details || 'Falha na resposta do servidor.');
      }

      setParsingStep('Processando dados extraídos...');
      const parsed: ReceiptParseResult = await response.json();

      // Populate form
      setTitle(parsed.title);
      setAmount(parsed.amount.toString().replace('.', ','));
      setDate(parsed.date);
      setFlowType(parsed.flowType);
      setType('despesa'); // Receipts are typically expenses
      setNotes(parsed.notes || '');
      setParseConfidence(parsed.confidence);

      // Find matching category
      const matchedCat = categories.find(c => 
        c.name.toLowerCase() === parsed.categoryName.toLowerCase() ||
        c.name.toLowerCase().includes(parsed.categoryName.toLowerCase()) ||
        parsed.categoryName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (matchedCat) {
        setCategoryId(matchedCat.id);
      } else {
        // If not matched, default to flow other category
        const otherCat = categories.find(c => c.flowType === parsed.flowType && c.name.startsWith('Outros'));
        if (otherCat) {
          setCategoryId(otherCat.id);
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao analisar comprovante via IA: ' + (err.message || err));
      setParsedFileName(null);
    } finally {
      setIsParsing(false);
      setParsingStep('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-slate-100 p-1.5 rounded-lg text-slate-700">
              <LucideIcon name="Plus" size={18} />
            </span>
            Novo Lançamento
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-1 rounded-md flex items-center gap-1">
            <LucideIcon name="Sparkles" size={10} /> IA Integrada
          </span>
        </div>

        {/* DRAG AND DROP RECEIPT SECTION */}
        <div 
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 mb-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden" 
            accept=".pdf,image/*"
          />
          
          <AnimatePresence mode="wait">
            {isParsing ? (
              <motion.div 
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-2"
              >
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold text-slate-700">{parsingStep}</p>
                <p className="text-[10px] text-slate-400 mt-1">Isso pode levar alguns segundos...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-2"
              >
                <div className="bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-500 p-3 rounded-full transition-colors">
                  <LucideIcon name="Upload" size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Arraste sua nota fiscal/recibo aqui</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ou clique para procurar arquivos (PDF, PNG, JPG)</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FEEDBACK MENSAGEM */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 mb-5 flex items-start gap-2">
            <LucideIcon name="AlertTriangle" size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {parseConfidence !== null && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LucideIcon name="Check" size={16} className="text-emerald-500" />
              <span>
                Preenchido com IA: <strong>{parsedFileName}</strong>
              </span>
            </div>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
              {parseConfidence}% de confiança
            </span>
          </div>
        )}

        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TIPO: RECEITA VS DESPESA */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('despesa')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'despesa' 
                  ? 'bg-white text-rose-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'despesa' ? 'bg-rose-600' : 'bg-slate-400'}`}></span>
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('receita')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'receita' 
                  ? 'bg-white text-emerald-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'receita' ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
              Receita
            </button>
          </div>

          {/* FLUXO: PESSOAL VS COMÉRCIO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Fluxo de Destino
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFlowType('pessoal')}
                className={`py-2 text-xs font-semibold border rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  flowType === 'pessoal'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LucideIcon name="User" size={14} />
                Contabilidade Pessoal
              </button>
              <button
                type="button"
                onClick={() => setFlowType('comercio')}
                className={`py-2 text-xs font-semibold border rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  flowType === 'comercio'
                    ? 'border-slate-800 bg-slate-900 text-white font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LucideIcon name="Briefcase" size={14} />
                Meu Comércio
              </button>
            </div>
          </div>

          {/* TITULO */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Descrição / Estabelecimento
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Mercadinho Central, Venda Cliente X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50"
            />
          </div>

          {/* VALOR & DATA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50"
              />
            </div>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Categoria
              </label>
              {onAddCategoryClick && (
                <button
                  type="button"
                  onClick={onAddCategoryClick}
                  className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  + Nova Categoria
                </button>
              )}
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50"
            >
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              {filteredCategories.length === 0 && (
                <option value="">Sem categorias disponíveis</option>
              )}
            </select>
          </div>

          {/* FORMA DE PAGAMENTO */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50 font-medium"
            >
              <option value="dinheiro">💵 Dinheiro em Espécie</option>
              <option value="pix">⚡ PIX</option>
              <option value="cartao_credito">💳 Cartão de Crédito</option>
              <option value="cartao_debito">💳 Cartão de Débito</option>
              <option value="outro">🔄 Outro / Boleto / Transferência</option>
            </select>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Observações (Opcional)
            </label>
            <textarea
              placeholder="Adicione detalhes adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors bg-slate-50/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] shadow-xs active:scale-[0.99]"
          >
            Confirmar e Registrar
          </button>
        </form>
      </div>
    </div>
  );
};
