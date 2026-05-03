/** Единое форматирование «в сети / был(а) …» по времени последней активности (сообщения и т.п.). */
export type PresenceStatus = {
  online: boolean;
  label: string;
};

/** Берёт самую позднюю метку времени из нескольких источников (сообщения, last_seen heartbeat). */
export function mergeLatestActivityTimestamps(
  ...isoTimes: Array<string | null | undefined>
): string | null {
  let maxMs = 0;
  for (const t of isoTimes) {
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
  }
  return maxMs > 0 ? new Date(maxMs).toISOString() : null;
}

export function formatLastSeen(value: string | null | undefined): PresenceStatus {
  if (!value) return { online: false, label: 'был(а) давно' };
  const last = new Date(value).getTime();
  if (Number.isNaN(last)) return { online: false, label: 'был(а) недавно' };
  const diffMin = Math.max(0, Math.floor((Date.now() - last) / 60000));
  if (diffMin <= 5) return { online: true, label: 'в сети' };
  if (diffMin < 60) return { online: false, label: `${diffMin} мин назад` };
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return { online: false, label: `${hours} ч назад` };
  const days = Math.floor(hours / 24);
  return { online: false, label: `${days} дн назад` };
}
