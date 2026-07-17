import React, { useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Undo, Redo, Type, Palette, Highlighter, ChevronDown, Check
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const TEXT_COLORS = [
  { name: 'Slate', value: '#1e293b', class: 'bg-slate-800' },
  { name: 'Azul', value: '#1d4ed8', class: 'bg-blue-700' },
  { name: 'Verde', value: '#047857', class: 'bg-emerald-700' },
  { name: 'Vermelho', value: '#be123c', class: 'bg-rose-700' },
  { name: 'Âmbar', value: '#b45309', class: 'bg-amber-700' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Sem Destaque', value: 'transparent', class: 'border border-sand-300 bg-white' },
  { name: 'Amarelo', value: '#fef08a', class: 'bg-yellow-200' },
  { name: 'Verde', value: '#bbf7d0', class: 'bg-emerald-200' },
  { name: 'Azul', value: '#bae6fd', class: 'bg-sky-200' },
  { name: 'Rosa', value: '#fbcfe8', class: 'bg-rose-200' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Comece a escrever...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('transparent');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [activeHeading, setActiveHeading] = useState('p');

  // Load initial content once, or when value diverges significantly from ref
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '<p><br></p>';
        updateCounts();
      }
    }
  }, [value]);

  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const cleanText = text.trim();
    setCharCount(text.length);
    setWordCount(cleanText === '' ? 0 : cleanText.split(/\s+/).length);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<p><br></p>' || html === '<br>' ? '' : html);
      updateCounts();
    }
  };

  const executeCommand = (command: string, arg: string = '') => {
    document.execCommand(command, false, arg);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const heading = e.target.value;
    setActiveHeading(heading);
    executeCommand('formatBlock', heading);
  };

  const handleTextColorSelect = (color: string) => {
    setTextColor(color);
    executeCommand('foreColor', color);
    setShowColorDropdown(false);
  };

  const handleHighlightSelect = (color: string) => {
    setHighlightColor(color);
    executeCommand('hiliteColor', color);
    setShowHighlightDropdown(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowColorDropdown(false);
      setShowHighlightDropdown(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className={`flex flex-col border border-sand-200 rounded-xl bg-white overflow-hidden shadow-sm ${className}`}>
      
      {/* Word Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-sand-150 bg-sand-50/50 select-none">
        
        {/* Undo/Redo */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('undo'); }}
          title="Desfazer"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('redo'); }}
          title="Refazer"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer mr-1"
        >
          <Redo size={14} />
        </button>

        <div className="h-4 w-[1px] bg-sand-200 mx-1" />

        {/* Headings Dropdown */}
        <div className="relative flex items-center mr-1">
          <select
            value={activeHeading}
            onChange={handleHeadingChange}
            className="text-[10px] font-semibold bg-white border border-sand-200 rounded-lg px-2 py-1 text-sand-700 outline-none hover:border-sand-300 focus:ring-1 focus:ring-softblue-500 cursor-pointer"
          >
            <option value="p">Texto Normal</option>
            <option value="h1">Título Grande (H1)</option>
            <option value="h2">Título Médio (H2)</option>
            <option value="h3">Título Pequeno (H3)</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-sand-200 mx-1" />

        {/* Bold, Italic, Underline */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
          title="Negrito"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer font-bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
          title="Itálico"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
          title="Sublinhado"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer underline"
        >
          <Underline size={14} />
        </button>

        <div className="h-4 w-[1px] bg-sand-200 mx-1" />

        {/* Text Color Dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorDropdown(!showColorDropdown); setShowHighlightDropdown(false); }}
            title="Cor do Texto"
            className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <Palette size={14} style={{ color: textColor }} />
            <ChevronDown size={10} className="text-sand-400" />
          </button>
          {showColorDropdown && (
            <div className="absolute left-0 mt-1 z-50 bg-white border border-sand-200 rounded-xl p-2 shadow-lg min-w-[120px] space-y-1">
              <span className="text-[9px] font-bold text-sand-400 uppercase font-mono px-1 block mb-1">Cor do texto</span>
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleTextColorSelect(color.value); }}
                  className="w-full flex items-center justify-between text-[11px] px-2 py-1 rounded-lg hover:bg-sand-50 text-sand-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${color.class}`} />
                    <span>{color.name}</span>
                  </div>
                  {textColor === color.value && <Check size={10} className="text-softblue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color Dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowHighlightDropdown(!showHighlightDropdown); setShowColorDropdown(false); }}
            title="Destaque (Marca-texto)"
            className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <Highlighter size={14} className={highlightColor !== 'transparent' ? 'text-sand-900' : 'text-sand-600'} style={{ backgroundColor: highlightColor !== 'transparent' ? highlightColor : 'transparent', padding: highlightColor !== 'transparent' ? '1px' : '0px', borderRadius: '4px' }} />
            <ChevronDown size={10} className="text-sand-400" />
          </button>
          {showHighlightDropdown && (
            <div className="absolute left-0 mt-1 z-50 bg-white border border-sand-200 rounded-xl p-2 shadow-lg min-w-[140px] space-y-1">
              <span className="text-[9px] font-bold text-sand-400 uppercase font-mono px-1 block mb-1">Destaque</span>
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleHighlightSelect(color.value); }}
                  className="w-full flex items-center justify-between text-[11px] px-2 py-1 rounded-lg hover:bg-sand-50 text-sand-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-md ${color.class}`} />
                    <span>{color.name}</span>
                  </div>
                  {highlightColor === color.value && <Check size={10} className="text-softblue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-sand-200 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
          title="Lista com marcadores"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
          title="Lista numerada"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer mr-1"
        >
          <ListOrdered size={14} />
        </button>

        <div className="h-4 w-[1px] bg-sand-200 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyLeft'); }}
          title="Alinhar à esquerda"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyCenter'); }}
          title="Centralizar"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyRight'); }}
          title="Alinhar à direita"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyFull'); }}
          title="Justificar"
          className="p-1.5 hover:bg-sand-100 rounded-lg text-sand-600 hover:text-sand-900 transition-colors cursor-pointer"
        >
          <AlignJustify size={14} />
        </button>
      </div>

      {/* Editor Content editable */}
      <div className="relative flex-1 min-h-[250px] bg-white flex">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="outline-none w-full p-4 text-xs leading-relaxed text-sand-900 overflow-y-auto max-h-[500px] prose prose-sm max-w-none focus:prose-headings:text-sand-950 prose-headings:font-serif prose-headings:font-bold prose-p:text-sand-800 focus:ring-0 select-text"
          style={{ minHeight: '250px' }}
        />
        {(!value || value === '<p><br></p>' || value === '<br>') && (
          <div 
            onClick={() => editorRef.current?.focus()}
            className="absolute top-4 left-4 text-sand-400 text-xs pointer-events-none select-none font-mono"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Word / Char Counter Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-sand-150 bg-sand-50/50 text-[10px] font-mono text-sand-500">
        <div className="flex items-center gap-3">
          <span>Palavras: <strong className="text-sand-700">{wordCount}</strong></span>
          <span>Caracteres: <strong className="text-sand-700">{charCount}</strong></span>
        </div>
        <span className="text-[8px] uppercase tracking-wider text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
          Editor Clínico Ativo
        </span>
      </div>

    </div>
  );
};
