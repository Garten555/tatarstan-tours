import type { TourSessionOption } from '@/lib/types/tour-session-option';

/** Дата и время для карточек и списков слотов */
export function formatSessionRange(startAt: string, endAt: string | null) {
  const s = new Date(startAt);
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  const startLabel = s.toLocaleString('ru-RU', opts);
  if (!endAt) return startLabel;
  const e = new Date(endAt);
  const endLabel = e.toLocaleString('ru-RU', opts);
  return `${startLabel} — ${endLabel}`;
}

/** Короткая подпись одной даты (день + месяц + время) */
export function formatSessionShort(startAt: string) {
  return new Date(startAt).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

/** Первая доступная по местам сессия или первая в списке */
export function pickDefaultSessionId(sessions: TourSessionOption[]): string {
  const withSpots = sessions.find((s) => sessionAvailableSpots(s) > 0);
  return (withSpots ?? sessions[0])?.id ?? '';
}
