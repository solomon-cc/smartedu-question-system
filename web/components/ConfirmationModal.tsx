import React from 'react';
import { X, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'delete'; // Type of modal
  onConfirm?: () => void; // For confirm/delete modals
  confirmText?: string;
  cancelText?: string;
  language: 'zh' | 'en';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmText,
  cancelText,
  language,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
      case 'error': return <X className="w-8 h-8 text-red-500" />;
      case 'delete': return <Trash2 className="w-8 h-8 text-red-500" />;
      case 'confirm': return <Info className="w-8 h-8 text-blue-500" />;
      default: return <Info className="w-8 h-8 text-gray-500" />;
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 text-center animate-in zoom-in-95 duration-300">
        <div className="flex justify-end -mt-4 -mr-4 mb-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 dark:text-gray-400" />
          </button>
        </div>

        <div className="mx-auto mb-6 flex items-center justify-center">
          {getIcon()}
        </div>
        
        <h3 className="text-xl font-black dark:text-white mb-3">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-8">{message}</p>

        {(type === 'confirm' || type === 'delete') ? (
          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              {cancelText || (language === 'zh' ? '取消' : 'Cancel')}
            </button>
            <button 
              onClick={handleConfirm}
              className={`flex-1 py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] 
                ${type === 'delete' ? 'bg-red-600 text-white shadow-red-500/30 hover:bg-red-700' : 'bg-primary-600 text-white shadow-primary-500/30 hover:bg-primary-700'}
              `}
            >
              {confirmText || (language === 'zh' ? '确定' : 'Confirm')}
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-[0.98]"
          >
            {language === 'zh' ? '好的' : 'OK'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfirmationModal;
