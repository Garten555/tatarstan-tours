/**
 * Прямая подстановка HTTPS с S3 иногда не даёт декодирование (CORP/CORS/Range в связке с Plyr).
 * Прокси на нашем origin обходит это — браузер запрашивает /api/video-proxy (same-origin).
 */
export function videoPlaybackSrc(raw: string): string {
  const t = raw.trim();
  if (!t || t.startsWith('blob:') || t.startsWith('/')) return t;
  if (!t.startsWith('http')) return t;

  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return t;

    const host = u.hostname;
    const extra = (process.env.NEXT_PUBLIC_VIDEO_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const allowed =
      host === 's3.twcstorage.ru' ||
      host.endsWith('.twcstorage.ru') ||
      extra.includes(host);

    if (!allowed) return t;

    return `/api/video-proxy?url=${encodeURIComponent(u.toString())}`;
  } catch {
    return t;
  }
}
