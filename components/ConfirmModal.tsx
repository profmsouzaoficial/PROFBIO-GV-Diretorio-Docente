import React from 'react';
import { XIcon } from './icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = "Confirmar", 
  cancelLabel = "Cancelar",
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${isDanger ? 'text-red-600' : 'text-[#034C83]'}`}>
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 leading-relaxed mb-8">
            {message}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 ${
                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#39A3B0] hover:bg-[#2c8b96]'
              }`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;