import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './Icon';
import { ConfirmModal } from './ConfirmModal';
import QRCode from 'qrcode';
import {
  saveProductToCloud,
  searchProductByBarcode,
  searchProductsByName,
  getAllCloudProducts,
  deleteProductFromCloud,
  DbProduct
} from '../firebase';
import { safeStorage } from '../lib/safeStorage';

// Helper to format prices robustly and prevent app crashing if a price field is not a number
export function formatPriceSafely(price: any): string {
  if (price === undefined || price === null) return '0,00';
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(',', '.')) || 0;
  return num.toFixed(2).replace('.', ',');
}

// Code 39 mapping for 100% pure React scannable barcodes
const CODE39_MAP: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '1001110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
  '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101'
};

// EAN-13 Parity patterns
const PARITY_PATTERNS = [
  'LLLLLL', // 0
  'LLGLGG', // 1
  'LLGGLG', // 2
  'LLGGGL', // 3
  'LGLLGG', // 4
  'LGGLLG', // 5
  'LGGGLL', // 6
  'LGLGLG', // 7
  'LGLGGL', // 8
  'LGGLGL'  // 9
];

const L_PATTERNS = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];

const G_PATTERNS = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
];

const R_PATTERNS = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];

export function calculateEAN13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits12[i], 10) || 0;
    sum += (i % 2 === 0) ? digit * 1 : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

interface LabelItem {
  id: string;
  name: string;
  price: number;
  barcode: string;
  quantity: number;
  unit?: string;
}

export const BarcodeSVG: React.FC<{
  value: string;
  type: 'CODE39' | 'EAN13' | 'QRCODE';
  height?: number;
  width?: number;
}> = ({ value, type, height = 30, width = 1.05 }) => {
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');

  useEffect(() => {
    try {
      if (type === 'QRCODE') {
        const targetVal = value ? String(value).trim() : 'https://ai.studio';
        QRCode.toString(targetVal, {
          type: 'svg',
          margin: 1,
          width: height * 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff00' // transparent background for printing/display options
          }
        }, (err, svgStr) => {
          if (!err && svgStr) {
            setQrCodeSvg(svgStr);
          } else {
            setQrCodeSvg('');
          }
        });
      }
    } catch (err) {
      console.error('Error generating QR code string:', err);
    }
  }, [value, type, height]);

  try {
    const cleanVal = value ? String(value).trim().toUpperCase() : '123456';

    if (type === 'QRCODE') {
      if (!qrCodeSvg) {
        return (
          <div className="w-8 h-8 rounded bg-slate-200/50 animate-pulse" />
        );
      }
      return (
        <div 
          className="flex flex-col items-center justify-center p-0.5 max-w-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
        />
      );
    }

    if (type === 'EAN13') {
      // Standard EAN-13 for supermarkets
      const numericOnly = cleanVal.replace(/[^0-9]/g, '');
      let padded = '';
      if (numericOnly.length >= 13) {
        padded = numericOnly.slice(0, 12);
      } else {
        padded = numericOnly.slice(0, 12).padStart(12, '0');
      }
      const checkDigit = calculateEAN13CheckDigit(padded);
      const fullEan = padded + checkDigit;

      // Left Guard
      let binary = '101';

      const firstDigit = parseInt(fullEan[0], 10) || 0;
      const parityPattern = PARITY_PATTERNS[firstDigit] || 'LLLLLL';

      // Left 6 digits
      for (let i = 1; i <= 6; i++) {
        const digit = parseInt(fullEan[i], 10) || 0;
        const isG = (parityPattern[i - 1] || 'L') === 'G';
        binary += isG ? (G_PATTERNS[digit] || '0000000') : (L_PATTERNS[digit] || '0000000');
      }

      // Center Guard
      binary += '01010';

      // Right 6 digits
      for (let i = 7; i <= 12; i++) {
        const digit = parseInt(fullEan[i], 10) || 0;
        binary += R_PATTERNS[digit] || '0000000';
      }

      // Right Guard
      binary += '101';

      const rects: React.ReactNode[] = [];
      let currentX = 0;

      // Render with elongated guard bars (just like real checkout items)
      for (let i = 0; i < binary.length; i++) {
        if (binary[i] === '1') {
          const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
          const finalHeight = isGuard ? height + 3.5 : height;
          rects.push(
            <rect
              key={i}
              x={currentX}
              y={0}
              width={width}
              height={finalHeight}
              fill="#000000"
            />
          );
        }
        currentX += width;
      }

      return (
        <div className="flex flex-col items-center justify-center w-full min-w-0">
          <div className="w-full flex items-center justify-center min-w-0 overflow-hidden">
            <svg 
              width={currentX} 
              height={height + 3.5} 
              viewBox={`0 0 ${currentX} ${height + 3.5}`} 
              className="max-w-full h-auto block"
              style={{ shapeRendering: 'crispEdges', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              {rects}
            </svg>
          </div>
          <div className="flex justify-between w-full px-1 text-[8px] font-mono mt-0.5 tracking-[0.5px] text-black font-black leading-none">
            <span>{fullEan[0]}</span>
            <span>{fullEan.slice(1, 7)}</span>
            <span>{fullEan.slice(7, 13)}</span>
          </div>
        </div>
      );
    }

    // Fallback: CODE39
    const sanitized = '*' + cleanVal.replace(/[^0-9A-Z\-.\s$/+*%]/g, '') + '*';
    let binary = '';
    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];
      const pattern = CODE39_MAP[char] || CODE39_MAP[' '];
      binary += pattern + '0';
    }

    const rects: React.ReactNode[] = [];
    let currentX = 0;

    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        rects.push(
          <rect
            key={i}
            x={currentX}
            y={0}
            width={width}
            height={height}
            fill="#000000"
          />
        );
      }
      currentX += width;
    }

    return (
      <div className="flex flex-col items-center justify-center w-full min-w-0">
        <div className="w-full flex items-center justify-center min-w-0 overflow-hidden">
          <svg 
            width={currentX} 
            height={height} 
            viewBox={`0 0 ${currentX} ${height}`} 
            className="max-w-full h-auto block"
            style={{ shapeRendering: 'crispEdges', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {rects}
          </svg>
        </div>
        <span className="text-[8px] font-mono mt-0.5 tracking-wider text-black font-black uppercase leading-none">{cleanVal}</span>
      </div>
    );
  } catch (err) {
    console.error('Error rendering barcode SVG:', err);
    return (
      <div className="flex flex-col items-center justify-center p-2 border border-rose-200 bg-rose-50 rounded text-rose-800 text-[10px] font-mono">
        <span>⚠️ Erro de Código</span>
        <span className="font-bold">{value || 'N/A'}</span>
      </div>
    );
  }
};

interface EditableRowProps {
  item: LabelItem;
  updateItemField: (id: string, field: keyof LabelItem, value: any) => void;
  removeItem: (id: string) => void;
}

const EditableRow: React.FC<EditableRowProps> = ({ item, updateItemField, removeItem }) => {
  const [localName, setLocalName] = useState(item.name);
  const [localPrice, setLocalPrice] = useState(() => formatPriceSafely(item.price));
  const [localBarcode, setLocalBarcode] = useState(item.barcode);
  const [localQuantity, setLocalQuantity] = useState(item.quantity.toString());

  const isNameFocused = useRef(false);
  const isPriceFocused = useRef(false);
  const isBarcodeFocused = useRef(false);
  const isQuantityFocused = useRef(false);

  useEffect(() => {
    if (!isNameFocused.current) setLocalName(item.name);
  }, [item.name]);

  useEffect(() => {
    if (!isPriceFocused.current) {
      setLocalPrice(formatPriceSafely(item.price));
    }
  }, [item.price]);

  useEffect(() => {
    if (!isBarcodeFocused.current) setLocalBarcode(item.barcode);
  }, [item.barcode]);

  useEffect(() => {
    if (!isQuantityFocused.current) setLocalQuantity(item.quantity.toString());
  }, [item.quantity]);

  const handleNameChange = (val: string) => {
    setLocalName(val);
    updateItemField(item.id, 'name', val.toUpperCase());
  };

  const handlePriceChange = (val: string) => {
    const cleanInput = val.replace(/[^0-9,.]/g, '');
    setLocalPrice(cleanInput);
    
    const normalized = cleanInput.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      updateItemField(item.id, 'price', parsed);
    }
  };

  const handlePriceBlur = () => {
    isPriceFocused.current = false;
    const normalized = localPrice.replace(',', '.');
    const parsed = parseFloat(normalized) || 0;
    updateItemField(item.id, 'price', parsed);
    setLocalPrice(formatPriceSafely(parsed));
  };

  const handleBarcodeChange = (val: string) => {
    setLocalBarcode(val);
    updateItemField(item.id, 'barcode', val);
  };

  const handleQuantityChange = (val: string) => {
    const cleanInput = val.replace(/[^0-9]/g, '');
    setLocalQuantity(cleanInput);
    const parsed = parseInt(cleanInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateItemField(item.id, 'quantity', parsed);
    }
  };

  const handleQuantityBlur = () => {
    isQuantityFocused.current = false;
    const parsed = parseInt(localQuantity, 10) || 1;
    updateItemField(item.id, 'quantity', parsed);
    setLocalQuantity(parsed.toString());
  };

  return (
    <tr className="border-b border-slate-100/60 hover:bg-slate-50/60 transition-colors">
      <td className="py-2 px-1">
        <input
          type="text"
          value={localName}
          onFocus={() => { isNameFocused.current = true; }}
          onBlur={() => { isNameFocused.current = false; }}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white rounded-lg uppercase font-black focus:outline-hidden"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="text"
          inputMode="decimal"
          value={localPrice}
          onFocus={() => { isPriceFocused.current = true; }}
          onBlur={handlePriceBlur}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white rounded-lg font-mono font-bold focus:outline-hidden"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="text"
          inputMode="numeric"
          value={localBarcode}
          onFocus={() => { isBarcodeFocused.current = true; }}
          onBlur={() => { isBarcodeFocused.current = false; }}
          onChange={(e) => handleBarcodeChange(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white rounded-lg font-mono focus:outline-hidden"
        />
      </td>
      <td className="py-2 px-1">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              const currentVal = parseInt(localQuantity, 10) || 1;
              const nextVal = Math.max(1, currentVal - 1);
              setLocalQuantity(nextVal.toString());
              updateItemField(item.id, 'quantity', nextVal);
            }}
            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg font-black text-sm flex items-center justify-center transition-all cursor-pointer select-none active:scale-90"
            title="Diminuir 1"
          >
            -
          </button>
          <input
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            value={localQuantity}
            onFocus={() => { isQuantityFocused.current = true; }}
            onBlur={handleQuantityBlur}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-10 py-1 text-xs border border-slate-200 bg-white focus:border-slate-300 rounded-lg font-mono text-center font-bold focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => {
              const currentVal = parseInt(localQuantity, 10) || 1;
              const nextVal = currentVal + 1;
              setLocalQuantity(nextVal.toString());
              updateItemField(item.id, 'quantity', nextVal);
            }}
            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg font-black text-sm flex items-center justify-center transition-all cursor-pointer select-none active:scale-90"
            title="Aumentar 1"
          >
            +
          </button>
        </div>
      </td>
      <td className="py-2 px-1 text-center">
        <button
          onClick={() => removeItem(item.id)}
          className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          title="Deletar produto"
        >
          <LucideIcon name="Trash2" size={14} />
        </button>
      </td>
    </tr>
  );
};

export const ShelfLabelPrinter: React.FC = () => {
  // Confirmation Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Label customizations
  const [labelWidth, setLabelWidth] = useState<number>(100); // in mm
  const [labelHeight, setLabelHeight] = useState<number>(30); // in mm
  const [titleFontSize, setTitleFontSize] = useState<number>(13); // in px
  const [priceFontSize, setPriceFontSize] = useState<number>(26); // in px
  const [barcodeScale, setBarcodeScale] = useState<number>(1.1); // scaling factor
  const [yellowBg, setYellowBg] = useState<boolean>(true);
  const [borderType, setBorderType] = useState<'solid' | 'dashed' | 'none'>('dashed');
  const [barcodeType, setBarcodeType] = useState<'CODE39' | 'EAN13' | 'QRCODE'>('EAN13');
  const [feedLines, setFeedLines] = useState<number>(1); // default 1 line spacing to avoid empty labels
  const [enableCutter, setEnableCutter] = useState<boolean>(false); // default false for label printing to prevent empty feeds

  // Connection states
  const [usbDevice, setUsbDevice] = useState<any>(null);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [bluetoothChar, setBluetoothChar] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<string>('');
  const [errorLog, setErrorLog] = useState<string>('');
  const [selectedPrinterModel, setSelectedPrinterModel] = useState<'generic' | 'gl033' | 'al3179'>('generic');

  // Interactive scanner test box states
  const [scannedLogs, setScannedLogs] = useState<{ time: string; content: string }[]>([]);
  const [scannedInput, setScannedInput] = useState<string>('');
  const scanTimeoutRef = useRef<any>(null);

  // Input navigation refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dbNewNameInputRef = useRef<HTMLInputElement>(null);

  // Helper for Enter navigation in the form
  const handleFocusNext = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const [activeTab, setActiveTab] = useState<'printer' | 'scanner_sandbox' | 'pairing_hub' | 'cloud_db'>('printer');
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Quick register states when scanned item is not in cloud database
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegisterBarcode, setQuickRegisterBarcode] = useState('');
  const [quickRegisterName, setQuickRegisterName] = useState('');
  const [quickRegisterPrice, setQuickRegisterPrice] = useState('');

  // Form input state for adding a product directly to the database
  const [dbNewName, setDbNewName] = useState('');
  const [dbNewPrice, setDbNewPrice] = useState('');
  const [dbNewBarcode, setDbNewBarcode] = useState('');
  const [dbNewUnit, setDbNewUnit] = useState('UN');
  const [editingDbProduct, setEditingDbProduct] = useState<DbProduct | null>(null);

  // Setting to optionally save print queue item additions to cloud database
  const [saveToDbByDefault, setSaveToDbByDefault] = useState(false);

  // Cloud Database states
  const [cloudProducts, setCloudProducts] = useState<DbProduct[]>([]);
  const [cloudSearchQuery, setCloudSearchQuery] = useState('');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<DbProduct[]>([]);
  const [suggestions, setSuggestions] = useState<DbProduct[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top);
    }
  }, []);

  // Helper to fetch cloud products
  const fetchCloudProducts = async () => {
    setIsLoadingCloud(true);
    try {
      const prods = await getAllCloudProducts();
      setCloudProducts(prods);
    } catch (e) {
      console.error('Erro ao buscar produtos da nuvem:', e);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudProducts();
  }, []);

  // Load from safeStorage if present, otherwise default to sample items
  const [items, setItems] = useState<LabelItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeStorage.getItem('gondola_print_queue');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      { id: '1', name: 'LEITE UHT INTEGRAL LITRO', price: 1.79, barcode: '789654125895', quantity: 1 },
      { id: '2', name: 'ARROZ INTEGRAL TIPO 1 5KG', price: 23.90, barcode: '789123456789', quantity: 1 },
      { id: '3', name: 'FEIJÃO CARIOCA CAMIL 1KG', price: 8.49, barcode: '789987654321', quantity: 2 },
      { id: '4', name: 'CAFÉ TORRADO TRÊS CORAÇÕES 500G', price: 16.99, barcode: '789456123012', quantity: 1 },
    ];
  });

  const itemsRef = useRef<LabelItem[]>(items);
  // Save to safeStorage when changed and keep itemsRef fresh
  useEffect(() => {
    itemsRef.current = items;
    safeStorage.setItem('gondola_print_queue', JSON.stringify(items));
  }, [items]);

  // Form input state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('UN');

  // Real-time suggestions for name input
  useEffect(() => {
    const term = newName.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const found = await searchProductsByName(term);
        // Only show first 5 suggestions
        setSuggestions(found.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [newName]);

  // Real-time lookup for barcode input
  useEffect(() => {
    const bcode = newBarcode.trim();
    if (bcode.length < 4) return;

    const delayDebounce = setTimeout(async () => {
      try {
        // Only search if not already matches or if we're scanning/typing new code
        const found = await searchProductByBarcode(bcode);
        if (found) {
          // Auto-fill Name and Price!
          setNewName(found.name || '');
          setNewPrice(formatPriceSafely(found.price));
          setNewUnit(found.unit || 'UN');
          setConnStatus(`Produto encontrado na nuvem: ${found.name}! Preenchido automaticamente.`);
        }
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [newBarcode]);

  // Real-time catalog search for name or barcode in print queue form
  const handleQuickSearchChange = (val: string) => {
    setQuickSearchQuery(val);
    const term = val.trim().toUpperCase();
    if (term.length < 1) {
      setQuickSearchResults([]);
      return;
    }
    const filtered = cloudProducts.filter(p => 
      p.name.toUpperCase().includes(term) || 
      p.barcode.toUpperCase().includes(term)
    );
    // Limit to 5 results for clean dropdown presentation
    setQuickSearchResults(filtered.slice(0, 5));
  };

  // Focus appropriate input on mount or tab change
  useEffect(() => {
    if (activeTab === 'printer') {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
    } else if (activeTab === 'cloud_db') {
      setTimeout(() => {
        dbNewNameInputRef.current?.focus();
      }, 150);
    } else {
      setEditingDbProduct(null);
    }
  }, [activeTab]);

  const handleCopyUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScannedBarcodeGlobally = (scannedCode: string) => {
    try {
      const code = String(scannedCode || '').trim();
      if (!code) return;

      // Trigger local audio ping feedback
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {}

      // Add to scanned logs
      const now = new Date().toLocaleTimeString('pt-BR');
      setScannedLogs(prev => [
        { time: now, content: code },
        ...prev.slice(0, 14)
      ]);

      // Check if item already exists in local print queue using itemsRef to avoid stale state issues
      const matchedIdx = itemsRef.current.findIndex(item => item.barcode === code);
      if (matchedIdx !== -1) {
        // Safely update quantity by checking real-time elements
        setItems(prev => {
          const idx = prev.findIndex(item => item.barcode === code);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              quantity: (updated[idx].quantity || 0) + 1
            };
            return updated;
          }
          return prev;
        });
        setConnStatus(`Leitor: Código ${code} reconhecido na fila! Quantidade aumentada.`);
        return;
      }

      // Query Firestore since it's not in the local print queue
      searchProductByBarcode(code).then((found) => {
        if (found) {
          setItems(currentItems => {
            const exists = currentItems.some(i => i.barcode === code);
            if (exists) {
              return currentItems.map(i => i.barcode === code ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [{
              id: Date.now().toString() + Math.random().toString().slice(2, 6),
              name: String(found.name || '').toUpperCase(),
              price: typeof found.price === 'number' ? found.price : parseFloat(String(found.price || '0').replace(',', '.')) || 0,
              barcode: String(found.barcode || code),
              quantity: 1
            }, ...currentItems];
          });
          setConnStatus(`Leitor: Produto ${found.name} encontrado em nuvem! Adicionado à fila.`);
          setShowQuickRegister(false);
        } else {
          // Not found - open the Quick Register widget
          setQuickRegisterBarcode(code);
          setQuickRegisterName('');
          setQuickRegisterPrice('');
          setShowQuickRegister(true);
          setConnStatus(`Leitor: Código ${code} não cadastrado na nuvem! Preencha para salvar.`);
        }
      }).catch((err) => {
        console.error('Erro ao buscar código scaneado:', err);
        setQuickRegisterBarcode(code);
        setQuickRegisterName('');
        setQuickRegisterPrice('');
        setShowQuickRegister(true);
        setConnStatus(`Leitor: Código ${code} não cadastrado! Preencha para salvar.`);
      });
    } catch (error) {
      console.error('Fatal crash in handleScannedBarcodeGlobally:', error);
    }
  };

  // Global hardware barcode scanner listener (e.g. NETUM C750 / generic)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // If user is focused on an input or textarea, let default behavior work and don't buffer/hijack keys
      if (isInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const scannedVal = buffer;
          buffer = '';
          handleScannedBarcodeGlobally(scannedVal);
        } else {
          buffer = '';
        }
      } else {
        const maxDelay = 250;
        if (timeDiff > maxDelay) {
          buffer = '';
        }
        
        if (e.key.length === 1) {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []); // Empty dependencies because state updates are handled atomically via callback updater

  // Quick Register Submit Handler
  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRegisterName.trim() || !quickRegisterBarcode.trim()) return;

    const rawPriceStr = String(quickRegisterPrice || '').replace(',', '.');
    const prc = parseFloat(rawPriceStr) || 0.00;
    const nameUpper = quickRegisterName.trim().toUpperCase();
    const barcodeClean = quickRegisterBarcode.trim();

    try {
      // 1. Save to cloud database (Firestore)
      await saveProductToCloud({
        name: nameUpper,
        price: prc,
        barcode: barcodeClean,
        unit: 'UN'
      });

      // 2. Add to print queue (items)
      const labelItem: LabelItem = {
        id: Date.now().toString(),
        name: nameUpper,
        price: prc,
        barcode: barcodeClean,
        quantity: 1,
        unit: 'UN'
      };
      setItems(prev => [labelItem, ...prev]);

      setConnStatus(`Produto ${nameUpper} cadastrado na nuvem e adicionado à fila!`);
      setShowQuickRegister(false);
      setQuickRegisterName('');
      setQuickRegisterPrice('');
      setQuickRegisterBarcode('');

      // Refresh catalog lists
      fetchCloudProducts();
    } catch (err) {
      console.error('Erro no cadastro rápido:', err);
      setConnStatus('Falha ao cadastrar produto rapidamente.');
    }
  };

  // Dedicated Database general registration submit
  const handleDbRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbNewName.trim()) return;

    const rawPriceStr = String(dbNewPrice || '').replace(',', '.');
    const prc = parseFloat(rawPriceStr) || 0.00;
    const nameUpper = dbNewName.trim().toUpperCase();
    
    let targetBarcode = dbNewBarcode.trim();
    if (!targetBarcode) {
      if (barcodeType === 'EAN13') {
        targetBarcode = '789' + Math.floor(100000000 + Math.random() * 900000000).toString();
      } else {
        targetBarcode = 'PROD' + Math.floor(10000 + Math.random() * 90000).toString();
      }
    }

    try {
      if (editingDbProduct) {
        // If barcode was changed, delete the old document to prevent orphaned duplicates
        if (targetBarcode !== editingDbProduct.barcode) {
          await deleteProductFromCloud(editingDbProduct.barcode);
        }
        await saveProductToCloud({
          name: nameUpper,
          price: prc,
          barcode: targetBarcode,
          unit: dbNewUnit
        });
        setConnStatus(`Produto "${nameUpper}" atualizado com sucesso no catálogo!`);
        setEditingDbProduct(null);
      } else {
        await saveProductToCloud({
          name: nameUpper,
          price: prc,
          barcode: targetBarcode,
          unit: dbNewUnit
        });
        setConnStatus(`Produto "${nameUpper}" cadastrado com sucesso no catálogo!`);
      }

      setDbNewName('');
      setDbNewPrice('');
      setDbNewBarcode('');
      setDbNewUnit('UN');
      fetchCloudProducts();
      setTimeout(() => {
        dbNewNameInputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error('Erro ao salvar produto no catálogo:', err);
      setConnStatus('Falha ao registrar produto no catálogo.');
    }
  };

  // Add custom item manually to the print queue
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const rawPriceStr = String(newPrice || '').replace(',', '.');
    const prc = parseFloat(rawPriceStr) || 0.00;
    const qty = parseInt(newQty) || 1;
    
    // Auto-generate realistic barcode if blank
    let targetBarcode = newBarcode.trim();
    if (!targetBarcode) {
      if (barcodeType === 'EAN13') {
        targetBarcode = '789' + Math.floor(100000000 + Math.random() * 900000000).toString();
      } else {
        targetBarcode = 'PROD' + Math.floor(10000 + Math.random() * 90000).toString();
      }
    }

    const item: LabelItem = {
      id: Date.now().toString(),
      name: newName.trim().toUpperCase(),
      price: prc,
      barcode: targetBarcode,
      quantity: qty,
      unit: newUnit
    };

    setItems(prev => [item, ...prev]);

    // Save product to Cloud only if the toggle is checked
    if (saveToDbByDefault) {
      try {
        await saveProductToCloud({
          name: item.name,
          price: item.price,
          barcode: item.barcode,
          unit: item.unit
        });
        // Refresh cloud lists
        fetchCloudProducts();
      } catch (err) {
        console.error('Erro ao registrar na nuvem:', err);
      }
    }

    setNewName('');
    setNewPrice('');
    setNewBarcode('');
    setNewQty('1');
    setNewUnit('UN');
    setSuggestions([]);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemField = (id: string, field: keyof LabelItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'price') {
          const formattedVal = typeof value === 'string' ? parseFloat(value.replace(',', '.')) || 0 : value;
          return { ...item, [field]: formattedVal };
        }
        if (field === 'quantity') {
          return { ...item, [field]: parseInt(value) || 1 };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Convert standard ASCII to ISO-8859-1 or raw text bytes for receipt printer compatibility
  const getBytesForText = (text: string) => {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code === 160) {
        code = 32; // Map non-breaking space (from pt-BR BRL currency spacing) to regular ASCII space
      } else if (code > 127) {
        const accents: Record<string, string> = {
          'á':'a','à':'a','â':'a','ã':'a','ä':'a','Á':'A','À':'A','Â':'A','Ã':'A','Ä':'A',
          'é':'e','è':'e','ê':'e','ë':'e','É':'E','È':'E','Ê':'E','Ë':'E',
          'í':'i','ì':'i','î':'i','ï':'i','Í':'I','Ì':'I','Î':'I','Ï':'I',
          'ó':'o','ò':'o','ô':'o','õ':'o','ö':'o','Ó':'O','Ò':'O','Ô':'O','Õ':'O','Ö':'O',
          'ú':'u','ù':'u','û':'u','ü':'u','Ú':'U','Ù':'U','Û':'U','Ü':'U',
          'ç':'c','Ç':'C'
        };
        const mapped = accents[text[i]];
        if (mapped) {
          code = mapped.charCodeAt(0);
        } else {
          code = 32; // Use space ' ' instead of '?' to avoid visual garbage on thermal paper
        }
      }
      bytes.push(code);
    }
    return new Uint8Array(bytes);
  };

  // Generate ESC/POS commands for raw thermal printing
  const generateEscPosCommands = () => {
    const chunks: Uint8Array[] = [];

    const addBytes = (arr: number[]) => {
      chunks.push(new Uint8Array(arr));
    };

    const addText = (text: string) => {
      chunks.push(getBytesForText(text));
    };

    const ESC = 0x1b;
    const GS = 0x1d;

    // Initialize
    addBytes([ESC, 0x40]);
    // Character Set
    addBytes([ESC, 0x74, 3]);

    // Calculate ESC/POS size bytes based on custom sliders
    // Title Font Size scale mapping:
    // titleFontSize ranges from 10 to 24 (default 13)
    let titleSizeByte = 0x00; // Normal
    if (titleFontSize <= 12) {
      titleSizeByte = 0x00; // Normal
    } else if (titleFontSize <= 16) {
      titleSizeByte = 0x01; // Double Height
    } else if (titleFontSize <= 20) {
      titleSizeByte = 0x11; // Double Width + Double Height
    } else {
      titleSizeByte = 0x22; // Triple Width + Triple Height
    }

    // Price Font Size scale mapping:
    // priceFontSize ranges from 18 to 110 (default 26)
    let priceSizeByte = 0x11; // Double Width + Double Height
    if (priceFontSize <= 22) {
      priceSizeByte = 0x00; // Normal
    } else if (priceFontSize <= 28) {
      priceSizeByte = 0x11; // Double Width + Double Height
    } else if (priceFontSize <= 38) {
      priceSizeByte = 0x22; // Triple Width + Triple Height
    } else if (priceFontSize <= 54) {
      priceSizeByte = 0x33; // Quad Width + Quad Height
    } else if (priceFontSize <= 72) {
      priceSizeByte = 0x44; // Penta Width + Penta Height
    } else if (priceFontSize <= 88) {
      priceSizeByte = 0x55; // Hexa Width + Hexa Height
    } else if (priceFontSize <= 100) {
      priceSizeByte = 0x66; // Septa Width + Septa Height
    } else {
      priceSizeByte = 0x77; // Octa Width + Octa Height
    }

    // Barcode Width factor (between 2 and 5) and Height scale (between 30 and 240) based on barcodeScale (0.6 to 1.7)
    const barcodeWidthByte = barcodeScale < 0.85 ? 2 : barcodeScale < 1.25 ? 3 : barcodeScale < 1.55 ? 4 : 5;
    const barcodeHeightByte = Math.max(30, Math.min(240, Math.round(55 * barcodeScale)));
    const qrModuleSizeByte = Math.max(2, Math.min(16, Math.round(5 * barcodeScale)));

    items.forEach(item => {
      for (let q = 0; q < item.quantity; q++) {
        addBytes([0x0a]);
        // Align center
        addBytes([ESC, 0x61, 0x01]);

        // 1. Description Header
        addBytes([ESC, 0x45, 0x01]); // Bold ON
        addBytes([GS, 0x21, titleSizeByte]); // Dynamically sized text
        addText(item.name.substring(0, 32) + "\n");
        addBytes([GS, 0x21, 0x00]); // Reset
        addBytes([ESC, 0x45, 0x00]); // Bold OFF

        addBytes([0x0a]);

        // 2. Barcode/QR Code printing
        if (barcodeType === 'QRCODE') {
          // Render generic QR parameters on thermal
          addBytes([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]); // Model 2
          addBytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, qrModuleSizeByte]); // Dynamically sized QR
          addBytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]); // Error level L

          // Send content bytes
          const textBytes = getBytesForText(item.barcode);
          const numL = textBytes.length + 3;
          const pL = numL & 0xff;
          const pH = (numL >> 8) & 0xff;
          addBytes([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);
          chunks.push(textBytes);

          // Trigger print QR
          addBytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
        } else {
          // Set custom barcode height
          addBytes([GS, 0x68, barcodeHeightByte]); 
          // Set custom width factor
          addBytes([GS, 0x77, barcodeWidthByte]);
          // Human readable text position (below)
          addBytes([GS, 0x48, 2]);

          if (barcodeType === 'EAN13') {
            // GS k 2 [digits...]
            const rawDigits = item.barcode.replace(/[^0-9]/g, '');
            const padded = rawDigits.slice(0, 12).padStart(12, '0');
            const check = calculateEAN13CheckDigit(padded);
            const fullCode = padded + check;

            addBytes([GS, 0x6b, 2]);
            addText(fullCode);
          } else {
            // Code 39
            const codeText = item.barcode.toUpperCase().replace(/[^0-9A-Z\-.\s$/+*%]/g, '');
            addBytes([GS, 0x6b, 4]);
            addText(codeText);
          }
          addBytes([0x00]); // Null terminator
        }

        addBytes([0x0a]);

        // 3. Large Price
        addBytes([ESC, 0x61, 0x01]);
        addBytes([ESC, 0x45, 0x01]);
        addBytes([GS, 0x21, priceSizeByte]); // Dynamically sized price

        const prcFormatted = "R$ " + formatPriceSafely(item.price);
        addText(prcFormatted + "\n");

        addBytes([GS, 0x21, 0x00]);
        addBytes([ESC, 0x45, 0x00]);

        // Post-label user-customized feed lines (preventing wasted blank labels)
        if (feedLines > 0) {
          const feedArr = Array.from({ length: feedLines }, () => 0x0a);
          addBytes(feedArr);
        }

        // Optional paper cutter command
        if (enableCutter) {
          addBytes([GS, 0x56, 66, 0]);
        }
      }
    });

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const compiled = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach(c => {
      compiled.set(c, offset);
      offset += c.length;
    });

    return compiled;
  };

  const handlePairBluetooth = async () => {
    setConnStatus('Buscando dispositivo Bluetooth...');
    setErrorLog('');
    
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      setErrorLog('A tecnologia WebBluetooth não é suportada por este navegador ou está bloqueada por restrições de segurança do iframe.');
      setConnStatus('Não suportado');
      return;
    }

    const optionalServices = [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP (Serial Port Profile)
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard FFE0 (Rongta / GoLink / AL-3179 / generic)
      '0000ffe1-0000-1000-8000-00805f9b34fb', // Standard FFE1 characteristics service
      '0000fff0-0000-1000-8000-00805f9b34fb', // Standard FFF0 service
      '0000fff1-0000-1000-8000-00805f9b34fb', // FFF1 write
      '000018f0-0000-1000-8000-00805f9b34fb', // Gprinter / some GoLink / Xprinter models
      '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat AirSync
      '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC Microchip BLE
    ];

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GL033' },
          { namePrefix: 'AL-3179' },
          { namePrefix: 'AL3179' },
          { namePrefix: 'MTP' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'pos' },
          { namePrefix: 'gp' },
          { namePrefix: 'GP' }
        ],
        optionalServices: optionalServices
      }).catch(async (e) => {
        console.log('Filtros Bluetooth falharam ou foram cancelados, tentando acceptAllDevices...', e);
        return await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: optionalServices
        });
      });

      setConnStatus(`Conectando a: ${device.name || 'Impressora'}...`);
      const server = await device.gatt.connect();
      setBluetoothDevice(device);

      setConnStatus('Buscando canal de escrita (GATT)...');
      const services = await server.getPrimaryServices();
      let writeChar: any = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writeChar) break;
        } catch (e) {
          // Keep searching
        }
      }

      // Strong fallback for GO LINK and AL-3179 if general scan fails
      if (!writeChar) {
        setConnStatus('Tentando busca profunda de canais de escrita...');
        const knownServiceUUIDs = [
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000fee7-0000-1000-8000-00805f9b34fb'
        ];
        const knownCharUUIDs = [
          '0000ffe1-0000-1000-8000-00805f9b34fb',
          '0000fff1-0000-1000-8000-00805f9b34fb',
          '0000fff2-0000-1000-8000-00805f9b34fb',
          '00002af1-0000-1000-8000-00805f9b34fb'
        ];
        for (const sUUID of knownServiceUUIDs) {
          try {
            const service = await server.getPrimaryService(sUUID);
            for (const cUUID of knownCharUUIDs) {
              try {
                const char = await service.getCharacteristic(cUUID);
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writeChar = char;
                  break;
                }
              } catch (e) {}
            }
            if (writeChar) break;
          } catch (e) {}
        }
      }

      if (!writeChar) {
        throw new Error('Canal de escrita (GATT write characteristic) não encontrado. Verifique se o dispositivo permite conexões BLE e possui características de escrita ESC/POS.');
      }

      setBluetoothChar(writeChar);
      setConnStatus(`Pareada via Bluetooth: ${device.name || 'Impressora'}`);
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Falha ao parear Bluetooth');
      setConnStatus('Erro Bluetooth');
    }
  };

  const handlePairBluetoothNoFilters = async () => {
    setConnStatus('Buscando QUALQUER dispositivo Bluetooth (sem filtros de nome)...');
    setErrorLog('');
    
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      setErrorLog('A tecnologia WebBluetooth não é suportada por este navegador ou está bloqueada por restrições de segurança do iframe.');
      setConnStatus('Não suportado');
      return;
    }

    const optionalServices = [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP (Serial Port Profile)
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard FFE0 (Rongta / GoLink / AL-3179 / generic)
      '0000ffe1-0000-1000-8000-00805f9b34fb', // Standard FFE1 characteristics service
      '0000fff0-0000-1000-8000-00805f9b34fb', // Standard FFF0 service
      '0000fff1-0000-1000-8000-00805f9b34fb', // FFF1 write
      '000018f0-0000-1000-8000-00805f9b34fb', // Gprinter / some GoLink / Xprinter models
      '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat AirSync
      '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC Microchip BLE
    ];

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: optionalServices
      });

      setConnStatus(`Conectando a: ${device.name || 'Impressora'}...`);
      const server = await device.gatt.connect();
      setBluetoothDevice(device);

      setConnStatus('Buscando canal de escrita (GATT)...');
      const services = await server.getPrimaryServices();
      let writeChar: any = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writeChar) break;
        } catch (e) {
          // Keep searching
        }
      }

      if (!writeChar) {
        setConnStatus('Tentando busca profunda de canais de escrita...');
        const knownServiceUUIDs = [
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000fee7-0000-1000-8000-00805f9b34fb'
        ];
        const knownCharUUIDs = [
          '0000ffe1-0000-1000-8000-00805f9b34fb',
          '0000fff1-0000-1000-8000-00805f9b34fb',
          '0000fff2-0000-1000-8000-00805f9b34fb',
          '00002af1-0000-1000-8000-00805f9b34fb'
        ];
        for (const sUUID of knownServiceUUIDs) {
          try {
            const service = await server.getPrimaryService(sUUID);
            for (const cUUID of knownCharUUIDs) {
              try {
                const char = await service.getCharacteristic(cUUID);
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writeChar = char;
                  break;
                }
              } catch (e) {}
            }
            if (writeChar) break;
          } catch (e) {}
        }
      }

      if (!writeChar) {
        throw new Error('Canal de escrita (GATT write characteristic) não encontrado. Verifique se o dispositivo possui características de escrita ESC/POS.');
      }

      setBluetoothChar(writeChar);
      setConnStatus(`Pareada via Bluetooth: ${device.name || 'Impressora'}`);
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Falha ao parear Bluetooth sem filtros');
      setConnStatus('Erro Bluetooth');
    }
  };

  const handlePairUsb = async () => {
    setConnStatus('Buscando dispositivo USB...');
    setErrorLog('');

    if (typeof navigator === 'undefined' || !(navigator as any).usb) {
      setErrorLog('A tecnologia WebUSB não é suportada por este navegador ou está bloqueada por restrições de segurança do iframe.');
      setConnStatus('Não suportado');
      return;
    }

    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      setUsbDevice(device);
      setConnStatus(`Pareada via USB: ${device.productName || 'Dispositivo USB'}`);
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Falha ao parear USB');
      setConnStatus('Erro USB');
    }
  };

  const handleUsbPrint = async () => {
    setErrorLog('');
    
    if (typeof navigator === 'undefined' || !(navigator as any).usb) {
      setErrorLog('A tecnologia WebUSB não é suportada por este navegador.');
      setConnStatus('Não suportado');
      return;
    }

    let activeDevice = usbDevice;

    try {
      if (!activeDevice) {
        setConnStatus('Nenhuma impressora USB pareada. Abrindo pareador...');
        activeDevice = await (navigator as any).usb.requestDevice({ filters: [] });
        setUsbDevice(activeDevice);
      }

      setConnStatus(`Iniciando envio para USB: ${activeDevice.productName || 'Dispositivo'}...`);
      await activeDevice.open();
      
      if (activeDevice.configuration === null) {
        await activeDevice.selectConfiguration(1);
      }

      await activeDevice.claimInterface(0);

      const interfaceObj = activeDevice.configuration.interfaces[0];
      const alternateObj = interfaceObj.alternates[0];
      const endpoint = alternateObj.endpoints.find((ep: any) => ep.direction === 'out' && ep.type === 'bulk');

      if (!endpoint) {
        throw new Error('Canal de saída USB (EP Out) não localizado.');
      }

      setConnStatus('Enviando dados ESC/POS...');
      const commands = generateEscPosCommands();
      await activeDevice.transferOut(endpoint.endpointNumber, commands);
      setConnStatus('Impresso com Sucesso via USB!');
      
      await activeDevice.releaseInterface(0);
      await activeDevice.close();
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Erro de conexão ou envio USB');
      setConnStatus('Erro USB');
    }
  };

  const handleBluetoothPrint = async () => {
    setErrorLog('');
    
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      setErrorLog('A tecnologia WebBluetooth não é suportada por este navegador.');
      setConnStatus('Não suportado');
      return;
    }

    let activeChar = bluetoothChar;
    let activeDevice = bluetoothDevice;

    const optionalServices = [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP (Serial Port Profile)
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard FFE0 (Rongta / GoLink / AL-3179 / generic)
      '0000ffe1-0000-1000-8000-00805f9b34fb', // Standard FFE1 characteristics service
      '0000fff0-0000-1000-8000-00805f9b34fb', // Standard FFF0 service
      '0000fff1-0000-1000-8000-00805f9b34fb', // FFF1 write
      '000018f0-0000-1000-8000-00805f9b34fb', // Gprinter / some GoLink / Xprinter models
      '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat AirSync
      '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC Microchip BLE
    ];

    try {
      if (!activeDevice) {
        setConnStatus('Nenhuma impressora Bluetooth pareada. Abrindo pareador...');
        activeDevice = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'GL033' },
            { namePrefix: 'AL-3179' },
            { namePrefix: 'AL3179' },
            { namePrefix: 'MTP' },
            { namePrefix: 'Printer' },
            { namePrefix: 'POS' },
            { namePrefix: 'pos' },
            { namePrefix: 'gp' },
            { namePrefix: 'GP' }
          ],
          optionalServices: optionalServices
        }).catch(async (e) => {
          console.log('Filtros Bluetooth falharam ou foram cancelados, tentando o fallback acceptAllDevices...', e);
          return await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: optionalServices
          });
        });
        setBluetoothDevice(activeDevice);
      }

      // If GATT is disconnected, or we don't have the characteristic, reconnect
      if (!activeDevice.gatt.connected || !activeChar) {
        setConnStatus(`Reconectando a: ${activeDevice.name || 'Impressora'}...`);
        const server = await activeDevice.gatt.connect();
        
        setConnStatus('Buscando canal de escrita...');
        const services = await server.getPrimaryServices();
        let writeChar: any = null;

        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
            if (writeChar) break;
          } catch (e) {
            // Keep searching
          }
        }

        // Deep fallback
        if (!writeChar) {
          setConnStatus('Tentando busca profunda de canais de escrita...');
          const knownServiceUUIDs = [
            '0000ffe0-0000-1000-8000-00805f9b34fb',
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000fee7-0000-1000-8000-00805f9b34fb'
          ];
          const knownCharUUIDs = [
            '0000ffe1-0000-1000-8000-00805f9b34fb',
            '0000fff1-0000-1000-8000-00805f9b34fb',
            '0000fff2-0000-1000-8000-00805f9b34fb',
            '00002af1-0000-1000-8000-00805f9b34fb'
          ];
          for (const sUUID of knownServiceUUIDs) {
            try {
              const service = await server.getPrimaryService(sUUID);
              for (const cUUID of knownCharUUIDs) {
                try {
                  const char = await service.getCharacteristic(cUUID);
                  if (char.properties.write || char.properties.writeWithoutResponse) {
                    writeChar = char;
                    break;
                  }
                } catch (e) {}
              }
              if (writeChar) break;
            } catch (e) {}
          }
        }

        if (!writeChar) {
          throw new Error('GATT write characteristic não encontrada após reconexão.');
        }

        activeChar = writeChar;
        setBluetoothChar(writeChar);
      }

      setConnStatus('Despachando comandos térmicos...');
      const commands = generateEscPosCommands();
      const chunkSize = 20;

      for (let i = 0; i < commands.length; i += chunkSize) {
        const chunk = commands.slice(i, i + chunkSize);
        await activeChar.writeValue(chunk);
      }

      setConnStatus('Impresso com Sucesso via Bluetooth!');
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Falha ao enviar impressão Bluetooth');
      setConnStatus('Erro Bluetooth');
    }
  };

  const handleScannerInputChange = (val: string) => {
    const safeVal = String(val || '');
    setScannedInput(safeVal);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    const trimmed = safeVal.trim();
    if (trimmed.length >= 3) {
      scanTimeoutRef.current = setTimeout(() => {
        handleScannedBarcodeGlobally(trimmed);
        setScannedInput('');
      }, 500); // Wait 500ms after the last character typed by the scanner to auto-submit
    }
  };

  // Trigger barcode scanner test processing
  const handleScannedSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    const val = String(scannedInput || '').trim();
    if (!val) return;

    setScannedInput('');
    handleScannedBarcodeGlobally(val);
  };

  return (
    <div className="space-y-6">
      {/* Styles injected for window.print() layout optimization */}
      <style>{`
        /* Non-print styling for the print portal container */
        #gondola-print-section-portal {
          display: none;
        }

        @media print {
          /* 1. Fully hide the interactive web app UI and root wrapper */
          #root {
            display: none !important;
          }
          
          /* 2. Show and format the direct body portal-rendered container */
          #gondola-print-section-portal {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 1.5mm !important;
            background: white !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            visibility: visible !important;
          }
          #gondola-print-section-portal * {
            visibility: visible !important;
          }
          
          html, body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
          .print-gondola-label {
            width: ${labelWidth}mm !important;
            height: ${labelHeight}mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #111111 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 2.5mm !important;
            background-color: ${yellowBg ? '#fef08a' : '#ffffff'} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Font size adjustments from the sliders */
          .print-gondola-label .label-title {
            font-size: ${titleFontSize}px !important;
            line-height: 1.1 !important;
            display: block !important;
            visibility: visible !important;
            height: auto !important;
          }
          .print-gondola-label .label-price {
            font-size: ${priceFontSize}px !important;
            line-height: 1 !important;
            display: inline-block !important;
            visibility: visible !important;
            height: auto !important;
          }
          /* Barcode width scaling */
          .print-gondola-label .label-barcode-container {
            width: ${38 * barcodeScale}mm !important;
            max-width: 65% !important;
            display: flex !important;
            align-items: flex-end !important;
            visibility: visible !important;
            height: auto !important;
          }
          .print-gondola-label .label-barcode-container * {
            visibility: visible !important;
          }
          .print-gondola-label .label-barcode-container svg {
            display: block !important;
            max-width: 100% !important;
            max-height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-gondola-label .label-barcode-container svg rect,
          .print-gondola-label .label-barcode-container svg path {
            fill: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Title Header Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-yellow-500 rounded-full blur-3xl opacity-15 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <span className="px-2.5 py-1 bg-yellow-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg">
              🏷️ MÓDULO DE GÔNDOLA & LOGÍSTICA
            </span>
            <h3 className="text-xl font-extrabold tracking-tight mt-1.5">Impressora de Etiquetas Ajustáveis</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Crie etiquetas com dimensões em milímetros. Desenvolvido para leitura de alta performance em telas de computadores ou papel térmico com leitores de alta velocidade como o <strong>NETUM C750 Bluetooth/USB</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (bluetoothChar || bluetoothDevice) {
                  handleBluetoothPrint();
                } else if (usbDevice) {
                  handleUsbPrint();
                } else {
                  window.print();
                }
              }}
              className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg"
              title={bluetoothDevice || usbDevice ? 'Imprimir na impressora térmica pareada' : 'Imprimir via gerenciador do sistema'}
            >
              <LucideIcon name="Printer" size={14} className="stroke-[3]" />
              {bluetoothChar || bluetoothDevice ? 'Imprimir via Bluetooth' : usbDevice ? 'Imprimir via USB' : 'Imprimir Etiquetas'}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleUsbPrint(); }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Disparar comandos térmicos diretos via WebUSB (Epson T20)"
            >
              <LucideIcon name="Usb" size={14} />
              Imprimir via USB
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleBluetoothPrint(); }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Disparar comandos diretos para o leitor/impressora Bluetooth GL033"
            >
              <LucideIcon name="Bluetooth" size={14} />
              Imprimir via Bluetooth
            </button>
          </div>
        </div>

        {/* Connection Feedbacks */}
        {(connStatus || errorLog) && (
          <div className="mt-4 p-3.5 bg-slate-850 border border-slate-800 rounded-2xl flex flex-col gap-1.5 text-xs">
            {connStatus && (
              <p className="flex items-center gap-2 font-mono text-yellow-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
                Status Conexão: {connStatus}
              </p>
            )}
            {errorLog && (
              <p className="text-rose-400 font-mono text-[11px] leading-relaxed">
                ⚠️ Informação: {errorLog} (Se as APIs diretas WebUSB/WebBLE do navegador estiverem limitadas no iframe, use a opção <strong>"Imprimir Etiquetas"</strong> padrão para imprimir via gerenciador do sistema).
              </p>
            )}
          </div>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button
          onClick={() => setActiveTab('printer')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'printer' 
              ? 'border-yellow-500 text-slate-900 bg-slate-50' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <LucideIcon name="Printer" size={13} />
          Configurador de Etiquetas
        </button>
        <button
          onClick={() => {
            setActiveTab('cloud_db');
            fetchCloudProducts(); // Refresh on entering
          }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'cloud_db' 
              ? 'border-yellow-500 text-slate-900 bg-slate-50' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <LucideIcon name="Cloud" size={13} className="text-sky-500" />
          Banco de Dados em Nuvem
        </button>
        <button
          onClick={() => setActiveTab('pairing_hub')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'pairing_hub' 
              ? 'border-yellow-500 text-slate-900 bg-slate-50' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <LucideIcon name="Bluetooth" size={13} className="text-blue-500" />
          Pareamento & Conectividade
        </button>
        <button
          onClick={() => setActiveTab('scanner_sandbox')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'scanner_sandbox' 
              ? 'border-yellow-500 text-slate-900 bg-slate-50' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="animate-pulse">🔴</span>
          Área de Teste Leitor NETUM C750
        </button>
      </div>

      <div className="animate-tab-fade">
        {activeTab === 'printer' && (
          <div
            key="printer-tab"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* LEFT COLUMN: ADJUSTERS & ADD ITEM FORM */}
            <div className="lg:col-span-5 space-y-6">
              {/* Dimensions control */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📏</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tamanho & Tipo de Etiqueta</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px] font-black uppercase border border-slate-150">
                    {barcodeType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Largura: <span className="text-slate-900 font-mono font-black">{labelWidth}mm</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={labelWidth}
                      onChange={(e) => setLabelWidth(Number(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Altura: <span className="text-slate-900 font-mono font-black">{labelHeight}mm</span>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      step="1"
                      value={labelHeight}
                      onChange={(e) => setLabelHeight(Number(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>
                </div>

                {/* Quick Presets for Bobinas */}
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5">
                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <span>⚡</span> Configurações Rápidas por Tipo de Bobina / Papel
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLabelWidth(74); // Standard TM-T20 80mm roll width print area is roughly 72-74mm
                        setLabelHeight(30);
                        setTitleFontSize(14);
                        setPriceFontSize(32);
                        setBarcodeScale(1.0);
                        setBorderType('dashed');
                      }}
                      className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Configura as dimensões ideais para bobinas térmicas de 80mm de largura (Epson TM-T20)"
                    >
                      🖨️ Bobina 80mm (Epson T20)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLabelWidth(52); // Mini 58mm roll width print area is roughly 48-52mm
                        setLabelHeight(26);
                        setTitleFontSize(11);
                        setPriceFontSize(22);
                        setBarcodeScale(0.7);
                        setBorderType('dashed');
                      }}
                      className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Configura as dimensões ideais para mini-impressoras térmicas Bluetooth de 58mm"
                    >
                      📱 Bobina 58mm (Mini)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Tipo de Código de Barras
                    </label>
                    <select
                      value={barcodeType}
                      onChange={(e) => setBarcodeType(e.target.value as any)}
                      className="w-full py-2 px-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="EAN13">EAN-13 (Padrão Comercial)</option>
                      <option value="CODE39">Code 39 (AlfaNumérico)</option>
                      <option value="QRCODE">QR Code (2D Alta Densidade)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Espessura / Zoom Código
                    </label>
                    <input
                      type="range"
                      min="0.6"
                      max="1.7"
                      step="0.05"
                      value={barcodeScale}
                      onChange={(e) => setBarcodeScale(Number(e.target.value))}
                      className="w-full accent-slate-700 cursor-pointer h-1.5 mt-2 bg-slate-100 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Fonte Nome Produto</label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      step="1"
                      value={titleFontSize}
                      onChange={(e) => setTitleFontSize(Number(e.target.value))}
                      className="w-full accent-slate-600 cursor-pointer h-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Fonte Preço Grande</label>
                    <input
                      type="range"
                      min="18"
                      max="110"
                      step="1"
                      value={priceFontSize}
                      onChange={(e) => setPriceFontSize(Number(e.target.value))}
                      className="w-full accent-slate-600 cursor-pointer h-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setYellowBg(!yellowBg)}
                    className={`py-2 px-3 border rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      yellowBg 
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-800 font-black shadow-3xs' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    🟨 Papel Amarelo Gôndola
                  </button>

                  <select
                    value={borderType}
                    onChange={(e) => setBorderType(e.target.value as any)}
                    className="py-2 px-3 border border-slate-200 bg-white rounded-xl text-[10px] font-bold text-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    <option value="dashed">Borda Pontilhada (Corte)</option>
                    <option value="solid">Borda Contínua</option>
                    <option value="none">Sem Linha de Borda</option>
                  </select>
                </div>

                {/* Advanced ESC/POS configurations */}
                <div className="pt-3.5 border-t border-slate-100 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <span>⚡</span> Configurações de Impressão Direta (Bluetooth/USB)
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Avanço pós-etiqueta: <span className="text-slate-900 font-mono font-black">{feedLines} {feedLines === 1 ? 'linha' : 'linhas'}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="1"
                        value={feedLines}
                        onChange={(e) => setFeedLines(Number(e.target.value))}
                        className="w-full accent-slate-700 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                      />
                      <span className="block text-[8px] text-slate-400 leading-normal">
                        Reduza para 1 ou 2 para evitar desperdício de etiquetas vazias.
                      </span>
                    </div>

                    <div className="flex flex-col justify-end space-y-1">
                      <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Comando de Corte (Cut)
                      </label>
                      <button
                        type="button"
                        onClick={() => setEnableCutter(!enableCutter)}
                        className={`w-full py-2 px-3 border rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          enableCutter 
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-black shadow-3xs' 
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                        title="Ative apenas se sua impressora de etiquetas tiver guilhotina e você quiser cortar após cada etiqueta."
                      >
                        {enableCutter ? '✂️ Corte Ativado' : '🚫 Sem Comando Corte'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Register Card for unknown scans */}
              {showQuickRegister && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-4 animate-slide-in">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800">
                      <span className="text-sm">✨</span>
                      <h4 className="text-xs font-black uppercase tracking-wider">Novo Código Detectado</h4>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickRegister(false)}
                      className="text-amber-700 hover:text-amber-900 font-extrabold text-[10px] uppercase tracking-wider"
                    >
                      Ignorar
                    </button>
                  </div>
                  
                  <div className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    O código de barras <code className="bg-amber-150 px-1.5 py-0.5 rounded font-mono font-black text-amber-950">{quickRegisterBarcode}</code> não está cadastrado. Preencha os dados abaixo para cadastrar na nuvem e adicionar à fila:
                  </div>

                  <form onSubmit={handleQuickRegisterSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-wider">Nome do Produto</label>
                      <input
                        type="text"
                        required
                        value={quickRegisterName}
                        onChange={(e) => setQuickRegisterName(e.target.value)}
                        placeholder="EX: DETERGENTE COCO 500ML"
                        className="w-full text-xs px-3 py-2 border border-amber-200 rounded-xl bg-white focus:outline-hidden font-black uppercase text-slate-800 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-wider">Preço de Venda (R$)</label>
                        <input
                          type="text"
                          required
                          value={quickRegisterPrice}
                          onChange={(e) => setQuickRegisterPrice(e.target.value)}
                          placeholder="2,49"
                          className="w-full text-xs px-3 py-2 border border-amber-200 rounded-xl bg-white focus:outline-hidden font-mono font-black text-slate-800 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1"
                        >
                          <LucideIcon name="Check" size={13} className="stroke-[3]" />
                          Salvar & Fila
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Add item to list */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📝</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Adicionar Produto na Fila</h4>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-150 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                    Fila de Impressão
                  </span>
                </div>

                <form onSubmit={handleAddItem} className="space-y-3.5">
                  {/* Unified Catalog Search */}
                  <div className="space-y-1.5 relative pb-3 border-b border-slate-100">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span>🔍</span> Buscar no Catálogo (Nome ou Código)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite o nome ou código para pesquisar..."
                        value={quickSearchQuery}
                        onChange={(e) => handleQuickSearchChange(e.target.value)}
                        className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-yellow-300 bg-yellow-50/15 focus:outline-hidden font-bold focus:ring-1 focus:ring-yellow-400 placeholder:text-slate-400 text-slate-800"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <LucideIcon name="Search" size={13} />
                      </div>
                      {quickSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickSearchQuery('');
                            setQuickSearchResults([]);
                          }}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer"
                        >
                          <LucideIcon name="X" size={12} />
                        </button>
                      )}
                    </div>

                    {quickSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-md z-50 overflow-hidden max-h-48 overflow-y-auto">
                        <div className="p-2 bg-slate-50 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                          <span>📦 Produtos no Catálogo</span>
                          <button 
                            type="button" 
                            onClick={() => setQuickSearchResults([])}
                            className="text-rose-500 hover:text-rose-600 font-extrabold cursor-pointer"
                          >
                            FECHAR
                          </button>
                        </div>
                        {quickSearchResults.map((sug, idx) => (
                          <button
                            key={sug.id || sug.barcode || `quick-${idx}`}
                            type="button"
                            onClick={() => {
                              setNewName(sug.name || '');
                              setNewPrice(formatPriceSafely(sug.price));
                              setNewBarcode(sug.barcode || '');
                              setNewUnit(sug.unit || 'UN');
                              setQuickSearchQuery('');
                              setQuickSearchResults([]);
                              setConnStatus(`Produto carregado do catálogo: ${sug.name}!`);
                              setTimeout(() => {
                                qtyInputRef.current?.focus();
                              }, 100);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0 cursor-pointer"
                          >
                            <span className="font-black text-slate-800 uppercase text-xs">{sug.name}</span>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Código: {sug.barcode}</span>
                              <span className="font-bold text-slate-900 bg-yellow-100 px-1.5 rounded-sm font-mono">R$ {formatPriceSafely(sug.price)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* First Row: Barcode */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Código de Barras</label>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder={barcodeType === 'EAN13' ? 'Ex: 7891234567890 (13 díg.)' : 'Código Opcional'}
                      value={newBarcode}
                      onChange={(e) => setNewBarcode(e.target.value)}
                      onKeyDown={(e) => handleFocusNext(e, nameInputRef)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-mono font-bold text-slate-800 focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>

                  {/* Second Row: Name with cloud suggestions */}
                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nome Comercial do Produto</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      placeholder="EX: COLA CAIXA COM 12 UNID"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => handleFocusNext(e, priceInputRef)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-black uppercase text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-yellow-400"
                    />

                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-md z-50 overflow-hidden max-h-48 overflow-y-auto">
                        <div className="p-2 bg-slate-50 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                          <span>📦 Produtos Salvos na Nuvem</span>
                          <button 
                            type="button" 
                            onClick={() => setSuggestions([])}
                            className="text-rose-500 hover:text-rose-600 font-extrabold"
                          >
                            FECHAR
                          </button>
                        </div>
                        {suggestions.map((sug, idx) => (
                          <button
                            key={sug.id || sug.barcode || `sug-${idx}`}
                            type="button"
                            onClick={() => {
                              setNewName(sug.name || '');
                              setNewPrice(formatPriceSafely(sug.price));
                              setNewBarcode(sug.barcode || '');
                              setNewUnit(sug.unit || 'UN');
                              setSuggestions([]);
                              setConnStatus(`Produto carregado da nuvem: ${sug.name}!`);
                              setTimeout(() => {
                                qtyInputRef.current?.focus();
                              }, 100);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-black text-slate-800 uppercase text-xs">{sug.name}</span>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Código: {sug.barcode}</span>
                              <span className="font-bold text-slate-900 bg-yellow-100 px-1.5 rounded-sm">R$ {formatPriceSafely(sug.price)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Third Row: Price, Unit, and Qty */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Preço (R$)</label>
                      <input
                        ref={priceInputRef}
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="1,79"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        onKeyDown={(e) => handleFocusNext(e, qtyInputRef)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-mono font-black text-slate-800 focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Unidade</label>
                      <select
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="w-full text-xs px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-bold text-slate-800 focus:ring-1 focus:ring-yellow-400"
                      >
                        <option value="UN">UN</option>
                        <option value="KG">KG</option>
                        <option value="KL">KL</option>
                        <option value="L">L</option>
                        <option value="ML">ML</option>
                        <option value="FD">FD</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Etiquetas</label>
                      <input
                        ref={qtyInputRef}
                        type="number"
                        min="1"
                        max="100"
                        value={newQty}
                        onChange={(e) => setNewQty(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-mono font-bold focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 px-1 py-0.5 select-none">
                      <input
                        type="checkbox"
                        id="saveToDbByDefault"
                        checked={saveToDbByDefault}
                        onChange={(e) => setSaveToDbByDefault(e.target.checked)}
                        className="accent-yellow-500 rounded cursor-pointer w-3.5 h-3.5"
                      />
                      <label htmlFor="saveToDbByDefault" className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider cursor-pointer">
                        Salvar na Nuvem também
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-36 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <LucideIcon name="Plus" size={14} className="stroke-[3]" />
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>

              {/* Informative Help panel for NETUM C750 */}
              <div className="bg-yellow-50/50 border border-yellow-200 p-4 rounded-3xl space-y-2">
                <div className="flex items-center gap-1.5 text-yellow-800 font-bold text-xs">
                  <span>💡</span>
                  <span>Dica de Leitura Off-Screen</span>
                </div>
                <p className="text-[11px] text-yellow-900/80 leading-relaxed">
                  Para efetuar leituras instantâneas off-screen (diretamente da tela do seu monitor ou celular) com o leitor CMOS do seu <strong>NETUM C750</strong>, aumente um pouco o controle de <strong>"Espessura / Zoom Código"</strong> para {'>'} 1.1x. Os leitores CMOS adoram uma área com bom contraste!
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: LIST & PREVIEW CANVAS */}
            <div className="lg:col-span-7 space-y-6">
              {/* Product Sheet Queue */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Fila para Impressão</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 font-black px-2.5 py-1 rounded-lg">
                      {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'Etiqueta Total' : 'Etiquetas Totais'}
                    </span>
                    {items.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmState({
                              isOpen: true,
                              title: 'Limpar Fila de Impressão',
                              message: 'Tem certeza de que deseja limpar todos os produtos da fila de impressão?',
                              variant: 'danger',
                              onConfirm: () => {
                                setItems([]);
                              }
                            });
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                          title="Limpar todos os produtos da fila de impressão"
                        >
                          <LucideIcon name="Trash2" size={12} />
                          Limpar Fila
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (bluetoothChar || bluetoothDevice) {
                              handleBluetoothPrint();
                            } else if (usbDevice) {
                              handleUsbPrint();
                            } else {
                              window.print();
                            }
                          }}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          title={bluetoothDevice || usbDevice ? 'Imprimir na impressora térmica pareada' : 'Imprimir via gerenciador do sistema'}
                        >
                          <LucideIcon name="Printer" size={12} className="stroke-[3]" />
                          {bluetoothChar || bluetoothDevice ? 'Imprimir via Bluetooth' : usbDevice ? 'Imprimir via USB' : 'Imprimir Fila'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Nenhum produto cadastrado na fila de gôndola. Adicione produtos na lateral!
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead>
                          <tr className="border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2 px-1">Nome do Produto</th>
                            <th className="py-2 w-20 px-1">Preço (R$)</th>
                            <th className="py-2 w-28 px-1">Código</th>
                            <th className="py-2 w-24 text-center px-1">Etqs.</th>
                            <th className="py-2 w-10 text-center px-1">Op.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <EditableRow
                              key={item.id}
                              item={item}
                              updateItemField={updateItemField}
                              removeItem={removeItem}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500">
                        {bluetoothChar || bluetoothDevice || usbDevice ? (
                          <span>A impressora térmica está conectada e pronta para impressão direta.</span>
                        ) : (
                          <span>Clique ao lado para disparar o gerenciador de impressão do seu computador ou celular.</span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (bluetoothChar || bluetoothDevice) {
                            handleBluetoothPrint();
                          } else if (usbDevice) {
                            handleUsbPrint();
                          } else {
                            window.print();
                          }
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95"
                      >
                        <LucideIcon name="Printer" size={14} className="stroke-[3]" />
                        {bluetoothChar || bluetoothDevice ? 'IMPRIMIR VIA BLUETOOTH AGORA' : usbDevice ? 'IMPRIMIR VIA USB AGORA' : 'IMPRIMIR FILA AGORA'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* STAGE: ACTUAL PREVIEW CONTAINER */}
              <div className="bg-slate-50 border border-slate-250/70 rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 mb-5 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">👁️</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Visualização das Etiquetas de Gôndola</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold italic bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Dimensão Real: {labelWidth}mm x {labelHeight}mm
                    </span>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (bluetoothChar || bluetoothDevice) {
                            handleBluetoothPrint();
                          } else if (usbDevice) {
                            handleUsbPrint();
                          } else {
                            window.print();
                          }
                        }}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <LucideIcon name="Printer" size={12} className="stroke-[3]" />
                        {bluetoothChar || bluetoothDevice ? 'Imprimir via Bluetooth' : usbDevice ? 'Imprimir via USB' : 'Imprimir Visualização'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Printable labels render area */}
                <div 
                  id="gondola-print-section"
                  className="flex flex-col gap-4 items-center justify-center p-5 bg-slate-100 border border-dashed border-slate-250 rounded-2xl max-h-[500px] overflow-y-auto"
                >
                  {items.map(item => (
                    Array.from({ length: item.quantity }).map((_, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="print-gondola-label relative bg-white flex flex-col justify-between p-2.5 shrink-0 select-none shadow-sm text-slate-950 transition-all hover:shadow-md"
                        style={{
                          width: `${labelWidth}mm`,
                          height: `${labelHeight}mm`,
                          backgroundColor: yellowBg ? '#fef08a' : '#ffffff',
                          borderColor: borderType === 'solid' ? '#000000' : borderType === 'dashed' ? '#c2c2c2' : 'transparent',
                          borderWidth: borderType === 'none' ? '0px' : '1px',
                          borderStyle: borderType,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        {/* Upper row: Product name */}
                        <div className="w-full overflow-hidden flex items-center min-h-[1.5em] max-h-[2.4em]">
                          <h4 
                            className="label-title font-black leading-[1.1] uppercase font-sans tracking-tight text-left text-slate-900 break-words whitespace-normal line-clamp-2"
                            style={{ fontSize: `${titleFontSize}px` }}
                          >
                            {item.name}
                          </h4>
                        </div>

                        {/* Lower row: Barcode / QR + Price */}
                        <div className="flex items-end justify-between w-full h-full pt-1 overflow-hidden gap-1">
                          {/* Left-side barcode render with dynamic sizing (avoiding transform: scale overflow) */}
                          <div className="label-barcode-container flex-1 min-w-0 flex items-end">
                            <BarcodeSVG 
                              value={item.barcode} 
                              type={barcodeType} 
                              height={Math.max(12, Math.min(36, (labelHeight * 0.75) * barcodeScale))} 
                              width={0.8 * barcodeScale} 
                            />
                          </div>

                          {/* Right-side big price */}
                          <div className="flex flex-col items-end justify-end ml-2 shrink-0 text-black">
                            <div className="flex items-baseline font-sans font-black leading-none">
                              <span className="text-[9px] font-extrabold mr-0.5 uppercase tracking-tighter">R$</span>
                              <span 
                                className="label-price font-black tracking-tighter"
                                style={{ fontSize: `${priceFontSize}px` }}
                              >
                                {formatPriceSafely(item.price)}
                              </span>
                            </div>
                            {item.unit && (
                              <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-1 rounded-sm mt-0.5 tracking-wider self-end">
                                por {item.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Top corner design slot */}
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-slate-900/10 pointer-events-none" />
                      </div>
                    ))
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cloud_db' && (
          <div
            key="cloud-db-tab"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* COLUMN 1: NEW CATALOG PRODUCT REGISTRATION */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{editingDbProduct ? "✍️" : "✨"}</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      {editingDbProduct ? "Editar no Catálogo" : "Cadastrar no Catálogo"}
                    </h4>
                  </div>
                  {editingDbProduct ? (
                    <span key="edit-badge" className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-md animate-pulse">
                      Modo Edição
                    </span>
                  ) : (
                    <span key="register-badge" className="text-slate-400 text-[10px] font-bold">NUVEM</span>
                  )}
                </div>

                <form onSubmit={handleDbRegisterSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nome Comercial do Produto</label>
                    <input
                      ref={dbNewNameInputRef}
                      type="text"
                      required
                      placeholder="EX: DETERGENTE COCO 500ML"
                      value={dbNewName}
                      onChange={(e) => setDbNewName(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-black uppercase text-slate-800 focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Preço de Venda (R$)</label>
                      <input
                        type="text"
                        required
                        placeholder="EX: 2,49"
                        value={dbNewPrice}
                        onChange={(e) => setDbNewPrice(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-mono font-black text-slate-800 focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Unidade</label>
                      <select
                        value={dbNewUnit}
                        onChange={(e) => setDbNewUnit(e.target.value)}
                        className="w-full text-xs px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-bold text-slate-800 focus:ring-1 focus:ring-yellow-400"
                      >
                        <option value="UN">UN</option>
                        <option value="KG">KG</option>
                        <option value="KL">KL</option>
                        <option value="L">L</option>
                        <option value="ML">ML</option>
                        <option value="FD">FD</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Código de Barras</label>
                    <input
                      type="text"
                      placeholder={barcodeType === 'EAN13' ? 'Opcional (Gera EAN-13)' : 'Opcional (Gera Código)'}
                      value={dbNewBarcode}
                      onChange={(e) => setDbNewBarcode(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-mono font-bold text-slate-800 focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingDbProduct ? (
                      <>
                        <button
                          key="cancel-edit-btn"
                          type="button"
                          onClick={() => {
                            setEditingDbProduct(null);
                            setDbNewName('');
                            setDbNewPrice('');
                            setDbNewBarcode('');
                            setConnStatus('Edição cancelada.');
                          }}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          key="save-edit-btn"
                          type="submit"
                          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <LucideIcon name="Save" size={14} />
                          Salvar
                        </button>
                      </>
                    ) : (
                      <button
                        key="create-catalog-btn"
                        type="submit"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <LucideIcon name="Cloud" size={14} />
                        Cadastrar Produto
                      </button>
                    )}
                  </div>
                </form>

                <div className="p-3.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                  <p className="font-bold text-slate-700">📌 Catálogo Independente:</p>
                  <p>Os produtos cadastrados neste menu são guardados permanentemente na nuvem. Eles não entram na fila de impressão de imediato, permitindo que você monte seu banco de dados limpo e organizado!</p>
                </div>
              </div>
            </div>

            {/* COLUMN 2: CLOUD PRODUCT SEARCH AND LIST */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>☁️</span> Banco de Dados de Produtos em Nuvem (Firestore)
                    </h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Pesquise, edite ou gerencie os produtos cadastrados que estão salvos de forma permanente na nuvem!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchCloudProducts}
                    disabled={isLoadingCloud}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all disabled:opacity-50 shrink-0"
                  >
                    <LucideIcon name="RefreshCw" size={12} className={isLoadingCloud ? 'animate-spin' : ''} />
                    Atualizar Lista
                  </button>
                </div>

                {/* SEARCH FILTERS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <LucideIcon name="Search" size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder="Digite o código de barras ou o nome comercial para buscar..."
                      value={cloudSearchQuery}
                      onChange={(e) => setCloudSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden font-bold focus:ring-1 focus:ring-yellow-400 placeholder:text-slate-400 text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <button
                      onClick={() => setCloudSearchQuery('')}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Limpar Filtro
                    </button>
                  </div>
                </div>

                {/* CLOUD PRODUCTS TABLE */}
                {isLoadingCloud ? (
                  <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Carregando catálogo da nuvem...</span>
                  </div>
                ) : (
                  (() => {
                    const filtered = cloudProducts.filter(p => {
                      const q = cloudSearchQuery.trim().toUpperCase();
                      if (!q) return true;
                      return p.name.includes(q) || p.barcode.includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-150 rounded-2xl text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                          <span>🔎</span>
                          {cloudProducts.length === 0 ? (
                            <span>O seu banco de dados em nuvem está vazio. Cadastre um produto na lateral esquerda para salvá-lo de forma permanente!</span>
                          ) : (
                            <span>Nenhum produto correspondente à busca.</span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                              <th className="py-2.5 px-4">Nome do Produto</th>
                              <th className="py-2.5 px-4 w-40">Preço Venda (R$)</th>
                              <th className="py-2.5 px-4 w-48 font-mono">Código de Barras</th>
                              <th className="py-2.5 px-4 w-44 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filtered.map((prod, idx) => (
                              <tr key={prod.id || prod.barcode || `cloud-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-black uppercase text-slate-800">{prod.name}</td>
                                <td className="py-3 px-4 font-black text-slate-900 font-mono">R$ {formatPriceSafely(prod.price)} <span className="text-[10px] text-slate-400 font-bold font-sans">/ {prod.unit || 'UN'}</span></td>
                                <td className="py-3 px-4 font-bold text-slate-600 font-mono">{prod.barcode}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        // Add to print queue directly
                                        setItems(prev => {
                                          const exists = prev.some(i => i.barcode === prod.barcode);
                                          if (exists) {
                                            return prev.map(i => i.barcode === prod.barcode ? { ...i, quantity: i.quantity + 1 } : i);
                                          } else {
                                            return [{
                                              id: Date.now().toString() + Math.random().toString().slice(2, 6),
                                              name: prod.name,
                                              price: prod.price,
                                              barcode: prod.barcode,
                                              quantity: 1,
                                              unit: prod.unit || 'UN'
                                            }, ...prev];
                                          }
                                        });
                                        setConnStatus(`Adicionado à fila de impressão: ${prod.name}`);
                                        setActiveTab('printer');
                                      }}
                                      className="px-2.5 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      title="Enviar para a fila de impressão"
                                    >
                                      <LucideIcon name="Printer" size={10} />
                                      Imprimir
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingDbProduct(prod);
                                        setDbNewName(prod.name);
                                        setDbNewPrice(formatPriceSafely(prod.price));
                                        setDbNewBarcode(prod.barcode);
                                        setDbNewUnit(prod.unit || 'UN');
                                        setTimeout(() => {
                                          dbNewNameInputRef.current?.focus();
                                        }, 50);
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      title="Editar informações do produto"
                                    >
                                      <LucideIcon name="Edit" size={10} />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmState({
                                          isOpen: true,
                                          title: 'Excluir Produto',
                                          message: `Tem certeza que deseja remover ${prod.name} da nuvem? Esta ação não pode ser desfeita.`,
                                          variant: 'danger',
                                          onConfirm: async () => {
                                            try {
                                              await deleteProductFromCloud(prod.barcode);
                                              setConnStatus(`Produto removido da nuvem: ${prod.name}`);
                                              fetchCloudProducts();
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all"
                                      title="Remover permanentemente da nuvem"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pairing_hub' && (
          <div
            key="pairing-tab"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* COLUMN 1: DIAGNOSTIC & IFRAME WORKAROUND */}
            <div className="lg:col-span-5 space-y-6">
              {/* Browser Capabilities Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="text-base">⚙️</span>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Compatibilidade do Sistema</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">WebBluetooth API:</span>
                    {typeof navigator !== 'undefined' && (navigator as any).bluetooth ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-lg">✔ SUPORTADO</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-lg">✘ INDISPONÍVEL</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">WebUSB API:</span>
                    {typeof navigator !== 'undefined' && (navigator as any).usb ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-lg">✔ SUPORTADO</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-lg">✘ INDISPONÍVEL</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Visualização em Iframe:</span>
                    {isIframe ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-lg animate-pulse">⚠️ RESTRITO (SANDBOX)</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-lg">✔ LIBERADO (ABA CHEIA)</span>
                    )}
                  </div>
                </div>

                {isIframe && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <h5 className="text-xs font-black uppercase text-amber-800 flex items-center gap-1">
                      ⚠️ Bloqueio de Permissão Detectado
                    </h5>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Navegadores modernos (Chrome, Edge, Opera) impedem o pareamento de portas Bluetooth e USB físicas quando o app é aberto dentro de uma janela menor (iframe) de pré-visualização. 
                      <strong className="block mt-1 font-bold">Para corrigir isso e liberar o pareamento, abra o aplicativo em uma nova aba completa.</strong>
                    </p>
                    
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); window.open(window.location.href, '_blank'); }}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <LucideIcon name="ExternalLink" size={13} className="stroke-[3]" />
                      Abrir em Nova Aba Completa
                    </button>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Link Direto para Copiar</span>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== 'undefined' ? window.location.href : ''}
                          className="flex-1 text-[9px] font-mono p-1.5 border border-slate-200 rounded bg-white text-slate-500 truncate focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="px-2 py-1 bg-slate-800 text-white rounded text-[9px] font-bold hover:bg-slate-700"
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Device Quick Simulator Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="text-base">🔌</span>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Simulador da Impressora</h4>
                </div>
                
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full ${bluetoothDevice || usbDevice ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <p className="text-xs font-black text-slate-800">
                    <span>Status: </span>
                    {bluetoothDevice ? (
                      <span>Bluetooth ({bluetoothDevice.name || 'Dispositivo'})</span>
                    ) : usbDevice ? (
                      <span>USB ({usbDevice.productName || 'Epson/Generic'})</span>
                    ) : (
                      <span>Desconectada</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                    {bluetoothDevice || usbDevice ? (
                      <span>Pronto para enviar instruções ESC/POS térmicas diretas.</span>
                    ) : (
                      <span>Nenhuma impressora ativa pareada pelo navegador.</span>
                    )}
                  </p>

                  {(bluetoothDevice || usbDevice) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBluetoothDevice(null);
                        setUsbDevice(null);
                        setConnStatus('Desconectada');
                      }}
                      className="mt-2 px-2.5 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold uppercase tracking-wider rounded border border-rose-200"
                    >
                      Desconectar Impressora
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: ACTIVE PAIRING PANEL & OS TUTORIALS */}
            <div className="lg:col-span-7 space-y-6">
              {/* Pairing Controls */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="text-base">⚡</span>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Painel de Pareamento & Conexão Física</h4>
                </div>

                {/* Printer Selector */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Selecione seu Modelo de Impressora Térmica:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPrinterModel('generic')}
                      className={`py-2 px-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer text-center ${
                        selectedPrinterModel === 'generic'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Padrão / Outra
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPrinterModel('gl033')}
                      className={`py-2 px-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer text-center ${
                        selectedPrinterModel === 'gl033'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      GO LINK GL033
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPrinterModel('al3179')}
                      className={`py-2 px-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer text-center ${
                        selectedPrinterModel === 'al3179'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      AL-3179 BT
                    </button>
                  </div>

                  {/* Model Specific Dynamic Banner */}
                  <div className="mt-2 text-[10px] font-medium leading-relaxed p-2 bg-white rounded-lg border border-slate-100">
                    {selectedPrinterModel === 'gl033' && (
                      <div className="text-blue-700">
                        <strong className="block font-bold">💡 Dicas para GO LINK GL033:</strong>
                        • Nome no Pareador: Geralmente aparece como <code className="bg-slate-100 px-1 rounded">GL033</code>, <code className="bg-slate-100 px-1 rounded">MTP-II</code> ou <code className="bg-slate-100 px-1 rounded">Printer001</code>.<br />
                        • PIN de Pareamento: <code className="bg-slate-100 px-1 rounded font-mono">0000</code> ou <code className="bg-slate-100 px-1 rounded font-mono">1234</code>.<br />
                        • Protocolo: ESC/POS nativo de 58mm (2 polegadas).
                      </div>
                    )}
                    {selectedPrinterModel === 'al3179' && (
                      <div className="text-indigo-700">
                        <strong className="block font-bold">💡 Dicas para Impressora AL-3179:</strong>
                        • Nome no Pareador: Geralmente aparece como <code className="bg-slate-100 px-1 rounded">AL-3179</code>, <code className="bg-slate-100 px-1 rounded">AL3179</code>, <code className="bg-slate-100 px-1 rounded">POS-58</code> ou <code className="bg-slate-100 px-1 rounded">Bluetooth Printer</code>.<br />
                        • PIN de Pareamento: <code className="bg-slate-100 px-1 rounded font-mono">0000</code> ou <code className="bg-slate-100 px-1 rounded font-mono">1234</code>.<br />
                        • Protocolo: ESC/POS térmico com buffer de 20 bytes por pacote.
                      </div>
                    )}
                    {selectedPrinterModel === 'generic' && (
                      <div className="text-slate-600">
                        <strong className="block font-bold">💡 Dicas para Impressoras Padrão:</strong>
                        Funciona com qualquer mini impressora térmica Bluetooth de 58mm compatível com comandos ESC/POS e transmissão via canal GATT Bluetooth BLE.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handlePairBluetooth(); }}
                    className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-left transition-all hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <LucideIcon name="Bluetooth" size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 font-black px-1.5 py-0.5 rounded">WEB-BLE</span>
                    </div>
                    <h5 className="text-xs font-black uppercase text-white">Parear via Bluetooth</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Vincular impressoras térmicas portáteis (como GL033, AL-3179 ou PT-210) sem cabos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handlePairUsb(); }}
                    className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-left transition-all hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <LucideIcon name="Usb" size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] bg-yellow-500/20 text-yellow-300 font-black px-1.5 py-0.5 rounded">WEB-USB</span>
                    </div>
                    <h5 className="text-xs font-black uppercase text-white">Parear via Cabo USB</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Vincular impressoras de mesa como Epson T20 ou Elgin I9 diretamente via cabo.
                    </p>
                  </button>
                </div>

                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handlePairBluetoothNoFilters(); }}
                    className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 rounded-2xl text-left transition-all hover:shadow-xs cursor-pointer flex items-center justify-between group shadow-3xs"
                  >
                    <div className="flex items-center gap-3">
                      <LucideIcon name="Search" size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <h5 className="text-xs font-black uppercase text-indigo-950">🔍 Procurar Qualquer Aparelho Bluetooth</h5>
                        <p className="text-[10px] text-indigo-700/80 leading-normal mt-0.5">
                          Mostrar TODOS os aparelhos próximos sem filtros (ideal para AL-3179 ou nomes personalizados).
                        </p>
                      </div>
                    </div>
                    <LucideIcon name="ChevronRight" size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Print Test Receipt */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left">
                    <h5 className="text-xs font-black uppercase text-slate-800">Enviar Impressão de Teste</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Testar alinhamento e velocidade de resposta da bobina térmica.</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (bluetoothDevice || usbDevice) {
                        if (bluetoothDevice) handleBluetoothPrint();
                        else handleUsbPrint();
                      } else {
                        // fallback helper simulated popup
                        setErrorLog('Não há nenhuma impressora Bluetooth/USB fisicamente pareada e ativa no momento.');
                        setConnStatus('Utilizando Gerenciador do Sistema');
                        window.print();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <LucideIcon name="Receipt" size={13} />
                    Imprimir Teste de Bobina
                  </button>
                </div>
              </div>

              {/* STEP BY STEP TUTORIAL GUIDE */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="text-base">📖</span>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tutorial de Configuração de Hardware</h4>
                </div>

                <div className="space-y-4 text-xs text-slate-600">
                  {/* MOBILE SPECIFIC SECTION */}
                  <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl space-y-2.5">
                    <h5 className="font-black text-amber-900 flex items-center gap-1">
                      📱 ATENÇÃO: Impressão pelo Celular / Smartphone
                    </h5>
                    <p className="leading-relaxed text-[11px] text-amber-800">
                      O pareamento por navegadores móveis possui requisitos rígidos de segurança. Siga este checklist obrigatório:
                    </p>
                    <ul className="list-disc pl-4 space-y-2 leading-relaxed text-[11px] text-amber-900 font-medium">
                      <li>
                        <strong className="text-amber-950 font-black">1. Abra em Nova Aba:</strong> Nunca tente parear dentro da janela de conversa do chat. Use o botão amarelo <span className="underline font-bold">"Abrir em Nova Aba Completa"</span> acima para carregar o app em tela cheia na URL direta.
                      </li>
                      <li>
                        <strong className="text-amber-950 font-black">2. Ative o GPS/Localização (Android):</strong> No Android, o Chrome exige que o <strong>GPS (Localização)</strong> do celular esteja ATIVO nas configurações rápidas do topo, caso contrário ele não exibirá nenhum dispositivo Bluetooth.
                      </li>
                      <li>
                        <strong className="text-amber-950 font-black">3. Usuários de iPhone (iOS):</strong> O navegador Safari e Chrome do iPhone bloqueiam WebBluetooth por padrão. Para usar a impressora no iPhone, você deve baixar o aplicativo gratuito <strong className="font-bold">Bluefy</strong> ou <strong className="font-bold">WebBLE</strong> na App Store, copiar a URL cheia deste app e abri-la lá dentro!
                      </li>
                      <li>
                        <strong className="text-amber-950 font-black">4. Limpe pareamentos antigos:</strong> Se a impressora estiver conectada em outro celular ou já estiver pareada nas configurações nativas do celular, ela pode estar "presa". Despareie das configurações nativas de Bluetooth antes de tentar pelo navegador.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2">
                    <h5 className="font-black text-slate-800 flex items-center gap-1">
                      🔵 Impressoras Térmicas Bluetooth (GL033 / AL-3179 / PT-210)
                    </h5>
                    <ul className="list-decimal pl-4 space-y-1.5 leading-relaxed text-[11px]">
                      <li>Ligue sua mini impressora térmica Bluetooth e certifique-se de que a luz de Bluetooth esteja piscando (indicando que está pronta para conexão).</li>
                      <li>Clique no botão <strong>"Parear via Bluetooth"</strong> acima.</li>
                      <li>Uma janela de busca do navegador aparecerá exibindo os aparelhos próximos.</li>
                      <li>
                        Selecione a impressora:
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 text-[10px]">
                          <li><strong>Para GO LINK GL033:</strong> Procure por <code className="bg-white px-1 border rounded text-slate-700">GL033</code>, <code className="bg-slate-100 px-1 rounded">MTP-II</code> ou <code className="bg-slate-100 px-1 rounded">Printer001</code>.</li>
                          <li><strong>Para AL-3179:</strong> Procure por <code className="bg-white px-1 border rounded text-slate-700">AL-3179</code>, <code className="bg-slate-100 px-1 rounded">POS-58</code> ou <code className="bg-slate-100 px-1 rounded">Bluetooth Printer</code>.</li>
                        </ul>
                      </li>
                      <li>Se o seu sistema operacional solicitar um PIN/Senha, insira <code className="bg-white px-1 border rounded text-slate-800 font-mono">0000</code> ou <code className="bg-white px-1 border rounded text-slate-800 font-mono">1234</code>.</li>
                      <li>Após a confirmação, o status mudará para <span className="text-emerald-600 font-black">PAREADO</span> e você poderá clicar em <strong>"Imprimir Teste de Bobina"</strong> para testar a comunicação!</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2">
                    <h5 className="font-black text-slate-800 flex items-center gap-1">
                      🔫 Leitor de Código de Barras (NETUM C750)
                    </h5>
                    <p className="leading-relaxed text-[11px] text-slate-500">
                      <strong>Importante:</strong> Leitores de código de barras como o <strong>NETUM C750</strong> funcionam como emuladores de teclado físico automático! 
                      <strong className="text-slate-700"> Você NÃO precisa pareá-lo dentro do software Web.</strong>
                    </p>
                    <ul className="list-decimal pl-4 space-y-1.5 leading-relaxed text-[11px]">
                      <li>Apenas ligue o seu leitor NETUM C750 e conecte-o ao seu computador ou celular via Bluetooth nativo ou pelo adaptador USB Wireless de 2.4GHz.</li>
                      <li>Uma vez emparelhado com seu sistema operacional, ele se tornará uma entrada automática de dados.</li>
                      <li>Vá para a nossa aba <strong>"Área de Teste Leitor NETUM C750"</strong>, clique no campo de texto e aperte o gatilho física apontando para o código de barras. Ele registrará instantaneamente!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scanner_sandbox' && (
          <div
            key="scanner-tab"
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            {/* COLUMN 1: INTERACTIVE SCAN TRIGGER INPUT */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="text-base">🔫</span>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Mapeamento do Leitor NETUM C750</h4>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-[11px] leading-relaxed space-y-1.5 shadow-3xs">
                  <p className="font-extrabold flex items-center gap-1">
                    <span className="animate-ping inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    🛰️ CAPTURA INTELIGENTE ATIVA
                  </p>
                  <p>
                    O seu leitor de códigos de barras (como o <strong>NETUM C750</strong>) funciona simulando um teclado físico rápido.
                  </p>
                  <p className="font-bold">
                    Para garantir que a leitura funcione 100% no seu celular ou computador, mantenha o foco clicado no campo abaixo antes de apertar o gatilho:
                  </p>
                </div>

                <form onSubmit={handleScannedSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <span>👉 CLIQUE AQUI PARA ESCANEAR COM O LEITOR 👈</span>
                      <span className="bg-emerald-500 text-white text-[8px] px-1 py-0.5 rounded-sm font-black animate-pulse">PRONTO</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Clique aqui e aperte o gatilho do leitor NETUM..."
                        value={scannedInput}
                        onChange={(e) => handleScannerInputChange(e.target.value)}
                        className="w-full text-xs px-3.5 py-4 rounded-xl border-2 border-emerald-500 focus:border-yellow-500 bg-white focus:outline-hidden font-mono font-black placeholder:text-slate-400 shadow-sm"
                      />
                      <div className="absolute right-3.5 top-4 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" title="Aguardando scanner" />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    ⚡ <strong>Processamento Automático Inteligente:</strong> Ao ler o código com o gatilho do leitor, o sistema aguarda 500ms e processa na hora (mesmo sem a tecla Enter configurada no aparelho)!
                  </p>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Simular / Testar Código de Barras Manual
                  </button>
                </form>

                <div className="p-3.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                  <p className="font-bold text-slate-700">📌 Como usar seu NETUM C750:</p>
                  <p>1. Ligue o leitor e conecte via Bluetooth ao seu smartphone/computador, ou utilize o dongle USB wireless.</p>
                  <p>2. Ao ler o código de barras, o sistema apita na hora e processa o produto!</p>
                </div>
              </div>
            </div>

            {/* COLUMN 2: REALTIME LOGS OF DETECTED BARCODES */}
            <div className="md:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Histórico de Leituras Recebidas</h4>
                  </div>
                  <button
                    onClick={() => setScannedLogs([])}
                    className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 uppercase tracking-wider cursor-pointer"
                  >
                    Limpar Logs
                  </button>
                </div>

                {scannedLogs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Aguardando leitura do scanner de código de barras...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {scannedLogs.map((log, index) => {
                      // Check if scanned code matches any product in queue
                      const matchedItem = items.find(item => item.barcode === log.content);

                      return (
                        <div 
                          key={index}
                          className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 animate-slide-in"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono text-emerald-600 font-bold">{log.time}</span>
                            <p className="text-xs font-mono font-black text-slate-800">
                              Código Scaneado: <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">{log.content}</span>
                            </p>
                            {matchedItem && (
                              <p className="text-[11px] text-emerald-800 font-bold">
                                🛒 Produto Associado: <span className="uppercase text-emerald-900">{matchedItem.name}</span> (R$ {formatPriceSafely(matchedItem.price)})
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">
                              ✔ SUCESSO
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* React Portal for Print Section to completely bypass #root styles during window.print() */}
      {typeof document !== 'undefined' && createPortal(
        <div 
          id="gondola-print-section-portal"
          className="hidden print:flex flex-col gap-4 items-center justify-center p-5 bg-white"
        >
          {items.map(item => (
            Array.from({ length: item.quantity }).map((_, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="print-gondola-label relative bg-white flex flex-col justify-between p-2.5 shrink-0 select-none text-slate-950"
                style={{
                  width: `${labelWidth}mm`,
                  height: `${labelHeight}mm`,
                  backgroundColor: yellowBg ? '#fef08a' : '#ffffff',
                  borderColor: '#000000',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                {/* Upper row: Product name */}
                <div className="w-full overflow-hidden flex items-center min-h-[1.5em] max-h-[2.4em]">
                  <h4 
                    className="label-title font-black leading-[1.1] uppercase font-sans tracking-tight text-left text-slate-900 break-words whitespace-normal line-clamp-2"
                    style={{ fontSize: `${titleFontSize}px` }}
                  >
                    {item.name}
                  </h4>
                </div>

                {/* Lower row: Barcode / QR + Price */}
                <div className="flex items-end justify-between w-full h-full pt-1 overflow-hidden gap-1">
                  {/* Left-side barcode render with dynamic sizing */}
                  <div className="label-barcode-container flex-1 min-w-0 flex items-end">
                    <BarcodeSVG 
                      value={item.barcode} 
                      type={barcodeType} 
                      height={Math.max(12, Math.min(36, (labelHeight * 0.75) * barcodeScale))} 
                      width={0.8 * barcodeScale} 
                    />
                  </div>

                  {/* Right-side big price */}
                  <div className="flex flex-col items-end justify-end ml-2 shrink-0 text-black">
                    <div className="flex items-baseline font-sans font-black leading-none">
                      <span className="text-[9px] font-extrabold mr-0.5 uppercase tracking-tighter">R$</span>
                      <span 
                        className="label-price font-black tracking-tighter"
                        style={{ fontSize: `${priceFontSize}px` }}
                      >
                        {formatPriceSafely(item.price)}
                      </span>
                    </div>
                    {item.unit && (
                      <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-1 rounded-sm mt-0.5 tracking-wider self-end">
                        por {item.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Top corner design slot */}
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-slate-900/10 pointer-events-none" />
              </div>
            ))
          ))}
        </div>,
        document.body
      )}

      {/* REUSABLE CONFIRMATION DIALOG MODAL */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
};
