import {
  guideHasConflict,
  type BusyGuideSession,
} from '@/lib/tour/guide-schedule-conflict';

/**
 * Выбирает свободного гида на слот с учётом расписания и буфера между турами.
 * Стратегия: у кого меньше выездов в окне — тот приоритетнее.
 */
export function pickAvailableGuide(
  guideIds: string[],
  busy: BusyGuideSession[],
  startMs: number,
  endMs: number,
  options?: {
    excludeSessionId?: string;
    excludeGuideIds?: string[];
  }
): string | null {
  const excluded = new Set(options?.excludeGuideIds ?? []);
  const candidates = guideIds.filter((id) => !excluded.has(id));
  if (candidates.length === 0) return null;

  const free = candidates.filter(
    (id) =>
      !guideHasConflict(busy, id, startMs, endMs, options?.excludeSessionId)
  );
  if (free.length === 0) return null;

  const load = (guideId: string) =>
    busy.filter((row) => row.guide_id === guideId).length;

  free.sort((a, b) => {
    const diff = load(a) - load(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });

  return free[0];
}
