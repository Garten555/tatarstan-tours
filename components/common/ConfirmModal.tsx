'use client';

import { Loader2, X } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  const confirmBtn =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/40 text-white'
      : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500/40 text-white';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 id="confirm-modal-title" className="text-lg font-black text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-5 py-4 text-sm font-semibold leading-relaxed text-gray-600">{description}</p>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${confirmBtn}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
