/** Часовой пояс туров (Татарстан / Москва, без DST). */
export const TOUR_WALL_CLOCK_TZ = 'Europe/Moscow';

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const HAS_TZ_RE = /[zZ]|[+-]\d{2}:\d{2}$/;

/** ISO / timestamptz → значение для input[type="datetime-local"] (локальное время браузера). */
export function isoToDatetimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local → ISO UTC. Вызывать в браузере (интерпретация как локальное время пользователя).
 */
export function datetimeLocalInputToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** «Стенное» время без суффикса TZ трактуем как Europe/Moscow (для API на сервере в UTC). */
function wallClockMoscowToIso(value: string): string | null {
  const m = value.trim().match(DATETIME_LOCAL_RE);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '0'] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 3, +mi, +s);
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Нормализация start_date / end_at перед записью в timestamptz.
 * — ISO с Z/offset: как есть;
 * — «2026-05-22T08:00»: 08:00 по Москве, не UTC.
 */
export function normalizeTourTimestampForStorage(
  value: string | null | undefined
): string | null | undefined {
  if (value == null) return value;
  const v = String(value).trim();
  if (!v) return null;

  if (HAS_TZ_RE.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const moscow = wallClockMoscowToIso(v);
  if (moscow) return moscow;

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
