'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  // Блокируем скролл при открытии
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Определяем текст кнопки по умолчанию в зависимости от варианта
  const defaultConfirmText = confirmText || (variant === 'danger' ? 'Удалить' : 'OK');

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      confirm: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      border: 'border-red-200',
    },
    warning: {
      confirm: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      border: 'border-amber-200',
    },
    info: {
      confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-blue-200',
    },
  };

  const styles = variantStyles[variant];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-6 md:p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 md:gap-5 mb-6 md:mb-8">
          <div className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center border-2 ${styles.border}`}>
            <AlertTriangle className={`w-7 h-7 md:w-8 md:h-8 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">{title}</h3>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 md:gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 md:px-6 md:py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold text-base md:text-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-black text-base md:text-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${styles.confirm}`}
          >
            {defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

