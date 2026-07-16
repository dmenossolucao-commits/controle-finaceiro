import React, { useState, useRef, useEffect } from 'react';
import { 
  addTransaction, 
  updateBank,
  getBanks
} from '../lib/dbService';
import { Category, Transaction, Bank, PaymentMethod } from '../types';

interface AIAgentWorkspaceProps {
  categories: Category[];
  transactions: Transaction[];
  onRefreshData: () => Promise<void>;
  showToast: (msg: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: Date;
  actionExecuted?: {
    description: string;
    amount: number;
    type: 'receita' | 'despesa';
    category: string;
    bank: string;
  };
}

// Simple internal Lucide icon dispatcher to avoid import issues
const LucideIcon = ({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) => {
  // We can render custom SVGs matching Lucide icons for high fidelity
  switch (name) {
    case 'Sparkles':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/>
          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/>
        </svg>
      );
    case 'Send':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="m22 2-7 20-4-9-9-4Z"/>
          <path d="M22 2 11 13"/>
        </svg>
      );
    case 'Bot':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
      );
    case 'User':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
    case 'CheckCircle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      );
    case 'TrendingUp':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      );
    case 'TrendingDown':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
          <polyline points="16 17 22 17 22 11"/>
        </svg>
      );
    case 'PlusCircle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8"/>
          <path d="M12 8v8"/>
        </svg>
      );
    case 'Briefcase':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M15 2H9a2 2 0 0 0-2 2v2H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4V4a2 2 0 0 0-2-2z"/>
          <rect width="20" height="14" x="2" y="6" rx="2"/>
          <path d="M12 11v4"/>
        </svg>
      );
    case 'ArrowRight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 12h14"/>
          <path d="m12 5 7 7-7 7"/>
        </svg>
      );
    case 'CornerDownLeft':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="9 10 4 15 9 20"/>
          <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
        </svg>
      );
    case 'X':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
      );
    case 'Minus':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 12h14"/>
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
};

export const AIAgentWorkspace: React.FC<AIAgentWorkspaceProps> = ({
  categories,
  transactions,
  onRefreshData,
  showToast
}) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const loadBanks = async () => {
    try {
      const fetchedBanks = await getBanks();
      setBanks(fetchedBanks);
    } catch (err) {
      console.error('Erro ao buscar bancos no AIAgentWorkspace:', err);
    }
  };

  useEffect(() => {
    loadBanks();
  }, []);

  // Global mouse/touch dragging handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    
    if (!hasBeenDragged && fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect();
      const currentPos = { x: rect.left, y: rect.top };
      setPosition(currentPos);
      startPos.current = currentPos;
      setHasBeenDragged(true);
    } else {
      startPos.current = { ...position };
    }
    
    hasMoved.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStart.current.x;
    const deltaY = clientY - dragStart.current.y;
    
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMoved.current = true;
    }

    let newX = startPos.current.x + deltaX;
    let newY = startPos.current.y + deltaY;

    const padding = 12;
    const btnSize = 56;
    if (newX < padding) newX = padding;
    if (newX > window.innerWidth - btnSize - padding) newX = window.innerWidth - btnSize - padding;
    if (newY < padding) newY = padding;
    if (newY > window.innerHeight - btnSize - padding) newY = window.innerHeight - btnSize - padding;

    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleEnd();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handleEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, position]);

  const handleButtonClick = () => {
    if (hasMoved.current) return;
    setIsOpen(!isOpen);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá! Sou o **OrganizaAI**, seu agente financeiro inteligente. 🧠💼\n\nTenho controle total do sistema e posso te ajudar a:\n- **Lançar despesas ou receitas** no Pix, Crédito, Dinheiro, etc.\n- **Passar relatórios completos** das suas finanças pessoais e comerciais.\n- **Analisar saldos** de contas e dar dicas de economia.\n\nExperimente falar: *"Lança uma despesa de 45 reais em combustível no Nubank pago no pix"* ou *"Me dá um relatório geral de despesas do mês"*!',
      createdAt: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertNewLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = inputValue;
    
    const newText = text.substring(0, start) + "\n" + text.substring(end);
    setInputValue(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
      }
    }, 0);
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Suggestions templates
  const suggestions = [
    { label: 'Lançar almoço de R$ 38 no Nubank hoje', text: 'Lança uma despesa de 38 reais em alimentação no banco Nubank pago no pix hoje' },
    { label: 'Lançar venda de R$ 1.200 comercial no Itaú', text: 'Lança uma receita de 1200 reais no Caixa Comercial em Vendas no banco Itaú' },
    { label: 'Análise de gastos Pessoais vs Comerciais', text: 'Me dá um relatório e comparação geral de gastos pessoais e comerciais do histórico' },
    { label: 'Quais contas/bancos têm saldo cadastrado?', text: 'Quais bancos estão cadastrados e quais os saldos de cada um hoje?' }
  ];

  // Helper to parse markdown-like structures to JSX elements
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let cleanLine = line;

      // Headers
      if (cleanLine.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-black text-slate-800 mt-3 mb-1">{cleanLine.substring(4)}</h4>;
      }
      if (cleanLine.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-black text-slate-900 mt-3.5 mb-1.5">{cleanLine.substring(3)}</h3>;
      }
      if (cleanLine.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-black text-slate-950 mt-4 mb-2">{cleanLine.substring(2)}</h2>;
      }

      // Lists
      if (cleanLine.trim().startsWith('- ') || cleanLine.trim().startsWith('* ')) {
        const bulletText = cleanLine.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-[11px] leading-relaxed text-slate-700 font-semibold my-0.5">
            {parseBold(bulletText)}
          </li>
        );
      }

      // Simple Table rows
      if (cleanLine.startsWith('|') && cleanLine.endsWith('|')) {
        const cells = cleanLine.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cleanLine.includes('---')) {
          return null; // Divider row
        }
        return (
          <div key={idx} className="flex gap-2 text-[10px] py-1.5 border-b border-slate-100 font-mono text-slate-600 bg-slate-50/50 px-2 rounded-md">
            {cells.map((cell, cidx) => (
              <span key={cidx} className="flex-1 font-bold">{parseBold(cell)}</span>
            ))}
          </div>
        );
      }

      if (cleanLine.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-[11px] leading-relaxed text-slate-700 font-semibold mb-1">
          {parseBold(cleanLine)}
        </p>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  // Execution engine of Gemini tool calls
  const executeToolCall = async (call: { name: string; args: any }) => {
    if (call.name === 'add_transaction') {
      const { description, amount, type, categoryName, flowType, bankName, date, paymentMethod } = call.args;

      // 1. Fuzzy match category
      let matchedCategory = categories.find(
        c => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (!matchedCategory) {
        matchedCategory = categories.find(
          c => c.name.toLowerCase().includes(categoryName.toLowerCase()) && (c.flowType === flowType || c.flowType === 'ambas')
        );
      }
      if (!matchedCategory) {
        matchedCategory = categories.find(c => c.flowType === flowType || c.flowType === 'ambas') || categories[0];
      }

      // 2. Fuzzy match bank account
      let matchedBank = banks.find(
        b => b.name.toLowerCase() === bankName.toLowerCase()
      );
      if (!matchedBank) {
        matchedBank = banks.find(
          b => b.name.toLowerCase().includes(bankName.toLowerCase())
        );
      }

      const finalDate = date || new Date().toISOString().split('T')[0];
      
      let finalPaymentMethod: PaymentMethod = 'pix';
      if (paymentMethod) {
        if (paymentMethod === 'credito') finalPaymentMethod = 'cartao_credito';
        else if (paymentMethod === 'debito') finalPaymentMethod = 'cartao_debito';
        else if (paymentMethod === 'dinheiro') finalPaymentMethod = 'dinheiro';
        else if (paymentMethod === 'outro') finalPaymentMethod = 'outro';
      }

      // Prepare transaction object
      const txData = {
        title: description.trim().toUpperCase(),
        amount: parseFloat(amount),
        date: finalDate,
        type: type as 'receita' | 'despesa',
        flowType: flowType as 'pessoal' | 'comercio',
        categoryId: matchedCategory.id,
        paymentMethod: finalPaymentMethod,
        notes: `Registrado via Inteligência Artificial (Assistente OrganizaAI). Conta: ${bankName}.`
      };

      // Create transaction
      const savedTx = await addTransaction(txData);

      // Adjust bank balance if matched
      if (matchedBank) {
        const txAmount = parseFloat(amount);
        const diff = type === 'receita' ? txAmount : -txAmount;
        const newBalance = matchedBank.balance + diff;
        await updateBank(matchedBank.id, { balance: newBalance });
      }

      // Refresh system states
      await loadBanks();
      await onRefreshData();

      return {
        description: txData.title,
        amount: txData.amount,
        type: txData.type,
        category: matchedCategory.name,
        bank: matchedBank ? matchedBank.name : bankName
      };
    }
    throw new Error('Ferramenta desconhecida.');
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build context structure for the API
      const context = {
        banks: banks.map(b => ({ name: b.name, balance: b.balance, type: b.type })),
        categories: categories.map(c => ({ id: c.id, name: c.name, flowType: c.flowType })),
        transactions: transactions.map(t => {
          const category = categories.find(c => c.id === t.categoryId);
          return {
            title: t.title,
            amount: t.amount,
            date: t.date,
            type: t.type,
            flowType: t.flowType,
            category: category ? category.name : 'Outros',
            notes: t.notes
          };
        })
      };

      // Map chat history (excluding the very first custom welcome message)
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      // Call server endpoint
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory,
          context: context,
          currentDate: new Date().toLocaleDateString('pt-BR')
        })
      });

      if (!response.ok) {
        throw new Error('Não foi possível se comunicar com o Agente de IA.');
      }

      const data = await response.json();

      let actionDetails = undefined;

      // Check if function calls are present
      if (data.functionCalls && data.functionCalls.length > 0) {
        const call = data.functionCalls[0];
        try {
          const result = await executeToolCall(call);
          actionDetails = result;
          showToast(`IA: Lançamento de "${result.description}" efetuado!`);
        } catch (execErr) {
          console.error('Erro ao executar ação da IA:', execErr);
          showToast('IA: Falha ao executar lançamento automático.');
        }
      }

      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        text: data.text || 'Lançamento efetuado com sucesso!',
        createdAt: new Date(),
        actionExecuted: actionDetails
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro ao me comunicar com o servidor. Por favor, verifique se a chave da API está configurada e tente novamente.',
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic floating styles for the chat card
  const chatStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  if (isMobile) {
    chatStyle.left = 0;
    chatStyle.right = 0;
    chatStyle.bottom = 0;
    chatStyle.width = '100%';
    chatStyle.maxHeight = '85vh';
    chatStyle.borderRadius = '24px 24px 0 0';
  } else {
    const chatWidth = 400;
    const chatHeight = 580;
    
    let btnX = position.x;
    let btnY = position.y;
    if (!hasBeenDragged && typeof window !== 'undefined') {
      btnX = window.innerWidth - 24 - 56; // 24px right, 56px button width
      btnY = window.innerHeight - 100 - 56; // 100px bottom, 56px button width
    }
    
    let top = btnY - chatHeight - 12;
    if (top < 16) {
      top = btnY + 68;
      if (top + chatHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - chatHeight - 16);
      }
    }
    
    let left = btnX - chatWidth + 56;
    if (left < 16) left = 16;
    if (left + chatWidth > window.innerWidth - 16) {
      left = window.innerWidth - chatWidth - 16;
    }
    
    chatStyle.top = top;
    chatStyle.left = left;
    chatStyle.width = chatWidth;
    chatStyle.height = chatHeight;
  }

  return (
    <>
      {/* FLOATING ACTION TRIGGER BUTTON (FAB) */}
      <div 
        ref={fabRef}
        style={{
          position: 'fixed',
          zIndex: 10000,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          ...(hasBeenDragged 
            ? { left: `${position.x}px`, top: `${position.y}px` } 
            : { right: '24px', bottom: '100px' })
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Only left click
          handleStart(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 group select-none cursor-pointer ${
          isOpen 
            ? 'bg-rose-500 hover:bg-rose-600 ring-4 ring-rose-500/20 text-white animate-pulse' 
            : 'bg-indigo-600 hover:bg-indigo-700 ring-4 ring-indigo-500/30 text-white'
        }`}
        title="Assistente IA (Arraste para reposicionar)"
        onClick={handleButtonClick}
      >
        {isOpen ? (
          <LucideIcon name="X" size={24} className="transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <div className="relative">
            <LucideIcon name="Sparkles" size={24} className="animate-pulse text-white" />
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping"></span>
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
          </div>
        )}
      </div>

      {/* CHAT PANEL CARD */}
      {isOpen && (
        <div 
          style={chatStyle}
          className="bg-slate-50 border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-fade-in"
          id="ai-agent-workspace-floating"
        >
          {/* HEADER */}
          <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center relative">
                <LucideIcon name="Sparkles" size={15} className="text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-[11px] font-black tracking-wide uppercase flex items-center gap-1.5">
                  OrganizaAI Assistente
                </h3>
                <p className="text-[8px] text-slate-400 font-bold tracking-wider uppercase">IA Agente Ativa</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 border border-slate-700/60 text-slate-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                Ativo
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                type="button"
              >
                <LucideIcon name="X" size={14} />
              </button>
            </div>
          </div>

          {/* CHAT CONTAINER */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin overscroll-contain"
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                
                {/* AVATAR */}
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${
                  m.role === 'user' 
                    ? 'bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                  {m.role === 'user' ? (
                    <LucideIcon name="User" size={13} />
                  ) : (
                    <LucideIcon name="Bot" size={13} />
                  )}
                </div>

                {/* BUBBLE CONTENT */}
                <div className="space-y-1.5 flex-1">
                  <div className={`rounded-2xl p-3.5 shadow-xs ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 rounded-tl-none'
                  }`}>
                    {m.role === 'user' ? (
                      <p className="text-[11px] leading-relaxed font-bold">{m.text}</p>
                    ) : (
                      <div className="space-y-1">
                        {renderMarkdown(m.text)}
                      </div>
                    )}
                  </div>

                  {/* ACTION EXECUTION CONFIRMATION */}
                  {m.actionExecuted && (
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 ml-1 space-y-1 shadow-xs animate-fade-in">
                      <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">
                        <LucideIcon name="CheckCircle" size={12} className="text-emerald-600" />
                        Lançamento Executado Pela IA!
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-emerald-900 font-bold bg-white/60 p-2 rounded-lg border border-emerald-100/40">
                        <div>Descrição: <span className="font-semibold text-slate-700">{m.actionExecuted.description}</span></div>
                        <div>Valor: <span className="font-mono text-slate-900">R$ {m.actionExecuted.amount.toFixed(2)}</span></div>
                        <div className="capitalize">Fluxo: <span className="font-semibold text-slate-700">{m.actionExecuted.type === 'receita' ? 'Receita' : 'Despesa'} ({m.actionExecuted.category})</span></div>
                        <div>Conta/Banco: <span className="font-semibold text-slate-700">{m.actionExecuted.bank}</span></div>
                      </div>
                    </div>
                  )}

                  {/* TIMESTAMP */}
                  <p className={`text-[8px] font-bold text-slate-400 tracking-wider uppercase px-1 ${m.role === 'user' ? 'text-right' : ''}`}>
                    {m.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-xl shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <LucideIcon name="Bot" size={13} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS CAROUSEL */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2 bg-white/40 border-t border-slate-200/60">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-1 px-1">Comandos de Exemplo</p>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap scrollbar-none">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputValue(s.text);
                      handleSendMessage(s.text);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 transition-all shadow-2xs hover:border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <LucideIcon name="Sparkles" size={9} className="text-indigo-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT FOOTER */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2"
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    // Stop event bubbling so pressing enter just goes to the next line naturally in textarea
                    e.stopPropagation();
                  } else if (e.key === 'Enter' && e.shiftKey) {
                    // Send message with Shift+Enter
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder="Lançar ou perguntar ao assistente..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-60 resize-none max-h-24 min-h-[40px] leading-relaxed"
                style={{ height: 'auto' }}
              />
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleInsertNewLine}
                  disabled={isLoading}
                  className="w-9 h-9 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Pular linha (Digitar embaixo)"
                >
                  <LucideIcon name="CornerDownLeft" size={14} />
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Enviar mensagem"
                >
                  <LucideIcon name="Send" size={14} />
                </button>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 font-bold px-1 flex items-center gap-1">
              <span>💡 Dica: Use o botão</span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600">
                <LucideIcon name="CornerDownLeft" size={8} />
                Nova Linha
              </span>
              <span>para pular linha (ou Shift+Enter). Envie com o botão Enviar.</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
