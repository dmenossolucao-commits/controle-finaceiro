import React from 'react';
import { LucideIcon } from './Icon';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Modal box */}
      <div
        className="bg-white border border-slate-100 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative z-10 p-6 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header / Icon */}
        <div className="flex items-start space-x-3.5">
          <div className={`p-3 rounded-xl shrink-0 ${
            variant === 'danger' ? 'bg-rose-50 text-rose-600' :
            variant === 'warning' ? 'bg-amber-50 text-amber-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            <LucideIcon 
              name={
                variant === 'danger' ? 'Trash2' :
                variant === 'warning' ? 'AlertTriangle' :
                'HelpCircle'
              } 
              size={20} 
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 text-white text-xs font-black rounded-xl transition-all shadow-3xs cursor-pointer ${
              variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
              variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
