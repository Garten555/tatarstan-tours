'use client';

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  onClose,
  variant = 'info',
}: AlertDialogProps) {
  // Не блокируем скролл для уведомлений - они не должны мешать работе

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-700 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${styles.button}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

