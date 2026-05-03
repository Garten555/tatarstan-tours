/**
 * Одна CSP для всего приложения (next.config). Не дублировать в middleware —
 * иначе браузер/ZAP видят слабую политику с unsafe-eval.
 */
export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseOrigin = '';
  let supabaseHost = '';
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl);
      supabaseOrigin = u.origin;
      supabaseHost = u.host;
    }
  } catch {
    /* ignore */
  }

  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';

  const connectParts = [
    "'self'",
    'blob:',
    supabaseOrigin,
    supabaseHost ? `https://${supabaseHost}` : '',
    supabaseHost ? `wss://${supabaseHost}` : '',
    `wss://ws-${cluster}.pusher.com`,
    `https://sockjs-${cluster}.pusher.com`,
    `wss://ws.pusher.com`,
    `https://sockjs.pusher.com`,
    'https://*.pusher.com',
    'wss://*.pusher.com',
  ].filter(Boolean);

  const imgParts = [
    "'self'",
    'data:',
    'blob:',
    /** emoji-picker-react: PNG эмодзи с jsDelivr (emoji-datasource-apple и др.) */
    'https://cdn.jsdelivr.net',
    'https://s3.twcstorage.ru',
    'https://images.unsplash.com',
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ];

  const mediaSrc = isDev
    ? "media-src 'self' http: https: blob:"
    : "media-src 'self' https: blob:";

  // Не включаем upgrade-insecure-requests в статический CSP: при открытии по http (localhost,
  // IP в LAN) браузер перепишет ресурсы на https и массово сломает загрузку чанков Next.js.
  // Для боевого домена уже выставлен Strict-Transport-Security в next.config.

  /** Карты в постах/турах: iframe не только yandex.ru — см. BlogPostCreator (Google, 2GIS). */
  const frameSrcParts = [
    "'self'",
    'https://yandex.ru',
    'https://yandex.com',
    'https://*.yandex.ru',
    'https://*.yandex.com',
    'https://www.google.com',
    'https://maps.google.com',
    'https://maps.google.ru',
    'https://*.google.com',
    'https://*.google.ru',
    'https://*.googleusercontent.com',
    'https://2gis.ru',
    'https://2gis.com',
    'https://*.2gis.ru',
    'https://*.2gis.com',
  ];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    `frame-src ${frameSrcParts.join(' ')}`,
    "object-src 'none'",
    `img-src ${imgParts.join(' ')}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    `connect-src ${connectParts.join(' ')}`,
    mediaSrc,
  ];

  return directives.join('; ');
}
