'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type ChatImageLightboxProps = {
  open: boolean;
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
};

export function ChatImageLightbox({
  open,
  urls,
  index,
  onClose,
  onIndexChange,
}: ChatImageLightboxProps) {
  const safeUrls = urls.filter(Boolean);
  const i = Math.min(Math.max(0, index), Math.max(0, safeUrls.length - 1));
  const src = safeUrls[i] || '';

  const goPrev = useCallback(() => {
    if (i <= 0) return;
    onIndexChange(i - 1);
  }, [i, onIndexChange]);

  const goNext = useCallback(() => {
    if (i >= safeUrls.length - 1) return;
    onIndexChange(i + 1);
  }, [i, safeUrls.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  if (!open || !src || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Закрыть"
      >
        <X className="h-6 w-6" />
      </button>
      {safeUrls.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30 sm:left-4"
            disabled={i <= 0}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Предыдущее"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30 sm:right-14"
            disabled={i >= safeUrls.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Следующее"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {i + 1} / {safeUrls.length}
          </div>
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[min(90vh,900px)] max-w-[min(96vw,1200px)] object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
