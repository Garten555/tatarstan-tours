'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sharePage } from '@/lib/share/share-page';

type ShareButtonProps = {
  /** Если не указан — берётся текущий адрес страницы */
  url?: string;
  title?: string;
  text?: string;
  variant?: 'card' | 'inline';
  className?: string;
};

export default function ShareButton({
  url,
  title,
  text,
  variant = 'inline',
  className,
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    if (busy || typeof window === 'undefined') return;

    const shareUrl = url || window.location.href;
    setBusy(true);

    try {
      const result = await sharePage({ url: shareUrl, title, text });

      if (result === 'shared') {
        toast.success('Ссылка отправлена');
      } else if (result === 'copied') {
        toast.success('Ссылка скопирована в буфер обмена');
      } else if (result === 'failed') {
        toast.error('Не удалось поделиться ссылкой');
      }
    } catch {
      toast.error('Не удалось поделиться ссылкой');
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={busy}
        className={
          className ??
          'w-full py-3 sm:py-3.5 md:py-4 lg:py-4 xl:py-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl border-2 border-gray-200 text-sm sm:text-base md:text-base lg:text-lg font-black text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 flex items-center justify-center gap-2.5 sm:gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:opacity-70'
        }
      >
        <Share2 className="w-5 h-5 sm:w-5 md:w-5 lg:w-6 lg:h-6" aria-hidden />
        Поделиться
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={busy}
      className={
        className ??
        'flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70'
      }
    >
      <Share2 className="w-5 h-5" aria-hidden />
      Поделиться
    </button>
  );
}
