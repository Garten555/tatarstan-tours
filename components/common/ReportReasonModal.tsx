'use client';

import { useEffect, useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

export type ReportReasonModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (reason: string) => void | Promise<void>;
  onCancel: () => void;
};

export default function ReportReasonModal({
  open,
  title = 'Жалоба',
  subtitle = 'Опишите причину (необязательно). Модераторы смогут её увидеть.',
  placeholder = 'Например: оскорбления, спам…',
  submitLabel = 'Отправить жалобу',
  busy = false,
  onSubmit,
  onCancel,
}: ReportReasonModalProps) {
  const [reason, setReason] = useState('');

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    await onSubmit(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Flag className="h-5 w-5" aria-hidden />
            </div>
            <h2 id="report-modal-title" className="text-lg font-black text-gray-900">
              {title}
            </h2>
          </div>
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
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-semibold text-gray-600">{subtitle}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            rows={4}
            disabled={busy}
            className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:bg-gray-50"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:from-amber-600 hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
