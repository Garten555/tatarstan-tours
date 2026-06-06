import type { TourSessionOption } from '@/lib/types/tour-session-option';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';

/** Дата и время для карточек и списков слотов (Europe/Moscow). */
export function formatSessionRange(startAt: string, endAt: string | null) {
  const startLabel = formatDateTimeShortRu(startAt);
  if (!endAt) return startLabel;
  const endLabel = formatDateTimeShortRu(endAt);
  return `${startLabel} — ${endLabel}`;
}

/** Короткая подпись одной даты (день + месяц + время) */
export function formatSessionShort(startAt: string) {
  return formatDateTimeShortRu(startAt);
}

/** Продолжительность между двумя моментами (как на странице тура) */
export function tourDurationLabel(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffHours <= 0) return 'до 1 часа';
    return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
  }

  return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
}

export function sessionAvailableSpots(s: TourSessionOption): number {
  return s.max_participants - (s.current_participants ?? 0);
}

/** Ближайший будущий выезд с местами, иначе первый будущий */
export function pickDefaultSessionId(sessions: TourSessionOption[]): string {
  const now = new Date();
  const upcoming = sessions.filter((s) => new Date(s.start_at) > now);
  const pool = upcoming.length > 0 ? upcoming : sessions;
  const withSpots = pool.find((s) => sessionAvailableSpots(s) > 0);
  return (withSpots ?? pool[0])?.id ?? '';
}
