import type { NextRequest } from 'next/server';

/**
 * Гранулярная защита от CSRF для cookie-сессии (Supabase): мутации на /api/*
 * принимаются только если заголовок Origin (или Referer при отсутствии Origin)
 * совпадает с разрешёнными источниками приложения.
 *
 * Запросы без Origin и без Referer не блокируются (CLI, мобильные клиенты, вебхуки).
 * Если передан Origin на недопустимый домен — 403.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Префиксы API, для которых проверка Origin не выполняется (внешние вебхуки и т.п.) */
const CSRF_SKIP_PREFIXES: string[] = [];

export function shouldValidateApiCsrf(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith('/api/')) return false;
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;
  for (const prefix of CSRF_SKIP_PREFIXES) {
    if (request.nextUrl.pathname.startsWith(prefix)) return false;
  }
  return true;
}

export function getAllowedRequestOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }

  const extra = process.env.CSRF_ALLOWED_ORIGINS;
  if (extra) {
    for (const raw of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        allowed.add(new URL(raw).origin);
      } catch {
        try {
          allowed.add(new URL(`https://${raw}`).origin);
        } catch {
          /* ignore */
        }
      }
    }
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      allowed.add(new URL(`https://${vercelUrl}`).origin);
    } catch {
      /* ignore */
    }
  }

  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto =
    forwardedProto?.split(',')[0]?.trim() ||
    (request.nextUrl.protocol === 'http:' ? 'http' : 'https');
  if (host) {
    try {
      allowed.add(new URL(`${proto}://${host}`).origin);
    } catch {
      /* ignore */
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const port of ['3000', '3001', '3002']) {
      allowed.add(`http://localhost:${port}`);
      allowed.add(`http://127.0.0.1:${port}`);
    }
    allowed.add('http://192.168.56.1:3000');
    allowed.add('http://192.168.56.1:3001');
  }

  return allowed;
}

/** Возвращает причину блокировки или null, если запрос можно пропустить */
export function validateApiMutationOrigin(request: NextRequest): string | null {
  if (!shouldValidateApiCsrf(request)) return null;

  const allowed = getAllowedRequestOrigins(request);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    if (!allowed.has(origin)) return 'invalid_origin';
    return null;
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!allowed.has(refOrigin)) return 'invalid_referer';
    } catch {
      return 'invalid_referer';
    }
    return null;
  }

  return null;
}
