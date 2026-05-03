'use client';

/**
 * Унифицированный прогресс загрузки файла (определённый % или неопределённый режим).
 */
export type UploadProgressBarProps = {
  label: string;
  /** 0–100 или null — неизвестный прогресс */
  percent: number | null;
  variant?: 'emerald' | 'amber';
  /** embedded — тёмная карточка (галерея комнаты) */
  tone?: 'light' | 'embedded';
  /** Для percent === null: заполнение-трек или бегунок (ZIP) */
  indeterminateStyle?: 'pulse' | 'shuttle';
  className?: string;
  sticky?: boolean;
};

export default function UploadProgressBar({
  label,
  percent,
  variant = 'emerald',
  tone = 'light',
  indeterminateStyle = 'pulse',
  className = '',
  sticky = false,
}: UploadProgressBarProps) {
  const isIndeterminate = percent === null;

  const wrap =
    tone === 'embedded'
      ? 'border-white/10 bg-stone-900/90 ring-1 ring-white/10'
      : variant === 'amber'
        ? 'border-amber-200/80 bg-white/95'
        : 'border-emerald-200/80 bg-white/95';

  const labelCls =
    tone === 'embedded'
      ? 'text-stone-200'
      : variant === 'amber'
        ? 'text-amber-950'
        : 'text-gray-800';

  const trackEmbedded = tone === 'embedded' ? 'bg-white/10' : variant === 'amber' ? 'bg-amber-200/80' : 'bg-gray-200';

  const fillEmbedded = tone === 'embedded' ? '[&::-webkit-progress-bar]:bg-white/15' : '';

  const accent =
    variant === 'amber'
      ? tone === 'embedded'
        ? '[&::-webkit-progress-value]:bg-amber-400 accent-amber-500'
        : '[&::-webkit-progress-value]:bg-amber-600 accent-amber-600'
      : tone === 'embedded'
        ? '[&::-webkit-progress-value]:bg-emerald-400 accent-emerald-500'
        : '[&::-webkit-progress-value]:bg-emerald-600 accent-emerald-600';

  const shuttleFill =
    variant === 'amber'
      ? tone === 'embedded'
        ? 'bg-amber-400'
        : 'bg-amber-600'
      : tone === 'embedded'
        ? 'bg-emerald-400'
        : 'bg-emerald-600';

  const pulseFill =
    variant === 'amber'
      ? tone === 'embedded'
        ? 'bg-amber-400/70'
        : 'bg-amber-500/80'
      : tone === 'embedded'
        ? 'bg-emerald-400/70'
        : 'bg-emerald-500/80';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3 py-3 shadow-sm backdrop-blur-md sm:px-4 ${wrap} ${sticky ? 'sticky top-0 z-20' : ''} ${className}`}
    >
      <div className={`mb-1.5 flex justify-between text-xs font-semibold ${labelCls}`}>
        <span>{label}</span>
        {!isIndeterminate ? <span>{percent}%</span> : <span>Подготовка…</span>}
      </div>
      {!isIndeterminate ? (
        <progress
          className={`h-3 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full ${fillEmbedded} ${accent}`}
          max={100}
          value={percent}
        />
      ) : indeterminateStyle === 'shuttle' ? (
        <div className={`relative h-3 w-full overflow-hidden rounded-full ${trackEmbedded}`}>
          <div className={`animate-gallery-zip-shuttle h-full rounded-full ${shuttleFill}`} />
        </div>
      ) : (
        <div className={`h-3 w-full overflow-hidden rounded-full ${trackEmbedded}`}>
          <div className={`h-full w-full animate-pulse rounded-full ${pulseFill}`} />
        </div>
      )}
    </div>
  );
}
