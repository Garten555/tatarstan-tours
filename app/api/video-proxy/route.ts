import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAllowedHostname(hostname: string): boolean {
  const extra = (process.env.NEXT_PUBLIC_VIDEO_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    hostname === 's3.twcstorage.ru' ||
    hostname.endsWith('.twcstorage.ru') ||
    extra.includes(hostname)
  );
}

/**
 * Прокси mp4/webm с разрешённого хранилища с пробросом Range (для перемотки).
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Нужен параметр url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: 'Некорректный url' }, { status: 400 });
  }

  if (target.protocol !== 'https:') {
    return NextResponse.json({ error: 'Разрешён только https' }, { status: 400 });
  }

  if (!isAllowedHostname(target.hostname)) {
    return NextResponse.json({ error: 'Хост не разрешён' }, { status: 403 });
  }

  const range = request.headers.get('range');
  const upstreamInit: RequestInit = {
    cache: 'no-store',
    headers: range ? { Range: range } : {},
  };

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), upstreamInit);
  } catch (e) {
    console.error('[video-proxy] fetch failed:', e);
    return NextResponse.json({ error: 'Не удалось загрузить файл' }, { status: 502 });
  }

  const out = new Headers();
  const passthrough = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ] as const;

  for (const name of passthrough) {
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
