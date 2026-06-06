'use client';

import { useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

export type DialogFrameProps = {
  isOpen: boolean;
  title: string;
  message?: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  iconBorderClassName: string;
  onClose?: () => void;
  footer: ReactNode;
  /** Поле ввода или доп. контент под текстом */
  children?: ReactNode;
};

export function DialogFrame({
  isOpen,
  title,
  message,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  iconBorderClassName,
  onClose,
  footer,
  children,
}: DialogFrameProps) {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-dialog-title"
    >
      <div
        className="mx-4 w-full max-w-md rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start gap-4 md:mb-8 md:gap-5">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 md:h-16 md:w-16 ${iconBgClassName} ${iconBorderClassName}`}
          >
            <Icon className={`h-7 w-7 md:h-8 md:w-8 ${iconClassName}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="app-dialog-title" className="mb-3 text-2xl font-black text-gray-900 md:text-3xl">
              {title}
            </h3>
            {message ? (
              <p className="text-base leading-relaxed text-gray-700 md:text-lg">{message}</p>
            ) : null}
            {children}
          </div>
        </div>
        <div className="flex justify-end gap-3 md:gap-4">{footer}</div>
      </div>
    </div>
  );
}

export const dialogCancelButtonClass =
  'rounded-xl bg-gray-100 px-5 py-2.5 text-base font-bold text-gray-700 shadow-md transition-all duration-200 hover:bg-gray-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:px-6 md:py-3 md:text-lg';

export function dialogConfirmButtonClass(accent: string): string {
  return `rounded-xl px-5 py-2.5 text-base font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 md:px-6 md:py-3 md:text-lg ${accent}`;
}
