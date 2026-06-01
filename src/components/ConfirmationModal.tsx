import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const buttonClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg focus:ring-red-500',
    warning: 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg focus:ring-indigo-500',
    info: 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg focus:ring-blue-500'
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in scale-in duration-100">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {variant === 'danger' ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <HelpCircle className="h-6 w-6" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-colors shadow-lg cursor-pointer ${buttonClasses}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
