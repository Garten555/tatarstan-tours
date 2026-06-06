import { getLevelProgress, STATUS_LEVEL_NAMES } from '@/lib/reputation/experience';

type LevelProgressBarProps = {
  reputationScore: number;
  className?: string;
};

export function LevelProgressBar({ reputationScore, className = '' }: LevelProgressBarProps) {
  const progress = getLevelProgress(reputationScore);
  const isMaxLevel = progress.nextLevelMin == null;

  return (
    <div className={`rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 ${className}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Уровень {progress.level}
          </div>
          <div className="text-base font-black text-emerald-900">{progress.levelName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-700">Опыт</div>
          <div className="text-lg font-black text-emerald-800">{reputationScore}</div>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-emerald-800">
        {isMaxLevel ? (
          <span>Максимальный уровень — {progress.levelName}</span>
        ) : (
          <span>
            До уровня {progress.level + 1} ({STATUS_LEVEL_NAMES[progress.level + 1] ?? ''}): ещё{' '}
            <span className="font-bold">{progress.xpToNextLevel}</span> опыта
          </span>
        )}
      </div>
    </div>
  );
}
