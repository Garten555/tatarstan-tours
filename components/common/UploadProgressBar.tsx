'use client';

/**
 * Унифицированный прогресс загрузки файла (определённый % или неопределённый режим).
 */
export type UploadProgressBarProps = {
  label: string;
  /** 0–100 или null — неизвестный прогресс */
  percent: number | null;
  /** Вторая строка под заголовком (например имя файла) */
  subtitle?: string;
  /**
   * default — в потоке документа (можно sticky).
   * floating — закрепление снизу по центру: заметно при длинной форме (админка тура).
   */
  layout?: 'default' | 'floating';
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
  subtitle,
  layout = 'default',
  variant = 'emerald',
  tone = 'light',
  indeterminateStyle = 'pulse',
  className = '',
  sticky = false,
}: UploadProgressBarProps) {
  const isIndeterminate = percent === null;
  const barHeight = layout === 'floating' ? 'h-4' : 'h-3';

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

  const floatingChrome =
    layout === 'floating'
      ? 'border-2 shadow-2xl shadow-emerald-900/15 ring-2 ring-emerald-500/25 py-4 sm:px-5'
      : '';

  const labelSize = layout === 'floating' ? 'text-sm sm:text-base' : 'text-xs';

  const inner = (
    <div
      role="status"
      aria-live="polite"
      aria-valuenow={isIndeterminate ? undefined : percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`rounded-xl border px-3 py-3 backdrop-blur-md sm:px-4 ${wrap} ${layout === 'default' && sticky ? 'sticky top-0 z-20' : ''} ${floatingChrome} ${className}`}
    >
      <div className={`mb-1.5 flex justify-between font-semibold ${labelSize} ${labelCls}`}>
        <span className="min-w-0 pr-2">{label}</span>
        {!isIndeterminate ? <span className="shrink-0 tabular-nums">{percent}%</span> : <span className="shrink-0">Подготовка…</span>}
      </div>
      {subtitle ? (
        <p className={`mb-2 truncate ${layout === 'floating' ? 'text-xs text-gray-600 sm:text-sm' : 'text-[11px] text-gray-600'}`} title={subtitle}>
          {subtitle}
        </p>
      ) : null}
      {!isIndeterminate ? (
        <progress
          className={`${barHeight} w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full ${fillEmbedded} ${accent}`}
          max={100}
          value={percent}
        />
      ) : indeterminateStyle === 'shuttle' ? (
        <div className={`relative ${barHeight} w-full overflow-hidden rounded-full ${trackEmbedded}`}>
          <div className={`animate-gallery-zip-shuttle h-full rounded-full ${shuttleFill}`} />
        </div>
      ) : (
        <div className={`${barHeight} w-full overflow-hidden rounded-full ${trackEmbedded}`}>
          <div className={`h-full w-full animate-pulse rounded-full ${pulseFill}`} />
        </div>
      )}
    </div>
  );

  if (layout === 'floating') {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="pointer-events-auto w-full max-w-lg">{inner}</div>
      </div>
    );
  }

  return inner;
}
