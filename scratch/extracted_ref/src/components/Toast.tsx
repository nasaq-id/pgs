import React, { useEffect } from 'react';
import { Check, X, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  action: string;
  type: 'success' | 'info' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="pointer-events-auto bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl z-[200] flex items-center space-x-3 transform transition-all duration-300 animate-fade-in">
      {isError ? (
        <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center">
          <X size={18} strokeWidth={2.5} />
        </div>
      ) : isInfo ? (
        <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
          <Info size={18} strokeWidth={2.5} />
        </div>
      ) : (
        <div className="w-8 h-8 bg-teal-500/20 text-teal-400 rounded-lg flex items-center justify-center">
          <Check size={18} strokeWidth={2.5} />
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {toast.action || 'Sistem Database'}
        </p>
        <p className="text-sm font-medium mt-0.5">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="ml-4 text-slate-400 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
