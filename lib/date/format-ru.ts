/** Единое форматирование дат для SSR и клиента (таймзона Москва — без ошибки гидратации #418). */

const LOCALE = 'ru-RU';
const TZ = 'Europe/Moscow';

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 22.05.2026, 21:51:38 */
export function formatDateTimeRu(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

/** 22 мая 2026 */
export function formatDateRu(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** 22 мая 2026, 21:51 */
export function formatDateTimeShortRu(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** 22 мая (без года) */
export function formatDayMonthRu(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/** 22 мая 2026 (короткий месяц) */
export function formatDayMonthYearRu(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
