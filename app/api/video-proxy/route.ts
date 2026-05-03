import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  const upstreamHeaders = new Headers({
    Accept: 'video/mp4,video/webm,video/*,*/*',
    'User-Agent':
      'Mozilla/5.0 (compatible; turrrr-video-proxy/1.0; +https://github.com/nodejs/undici)',
  });
  if (range) upstreamHeaders.set('Range', range);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      cache: 'no-store',
      headers: upstreamHeaders,
    });
  } catch (e) {
    console.error('[video-proxy] fetch failed:', e);
    return NextResponse.json({ error: 'Не удалось загрузить файл' }, { status: 502 });
  }

  // Иначе в <video> попадает XML/HTML/JSON от S3 — Chromium: MEDIA_ERR_SRC_NOT_SUPPORTED / «URL safety check»
  if (upstream.status !== 200 && upstream.status !== 206) {
    const snippet = await upstream.text().catch(() => '');
    console.error(
      '[video-proxy] upstream status',
      upstream.status,
      snippet.slice(0, 400)
    );
    return NextResponse.json(
      {
        error: 'Файл недоступен на хранилище',
        status: upstream.status,
      },
      { status: 502 }
    );
  }

  const out = new Headers();

  const passthrough = [
    'content-length',
    'content-range',
    'etag',
    'last-modified',
  ] as const;

  for (const name of passthrough) {
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }

  let acceptRanges = upstream.headers.get('accept-ranges');
  if (!acceptRanges || acceptRanges === 'none') {
    acceptRanges = 'bytes';
  }
  out.set('Accept-Ranges', acceptRanges);

  const rawType = upstream.headers.get('content-type');
  const baseType = rawType?.split(';')[0]?.trim().toLowerCase();
  let contentType = baseType;
  if (
    !contentType ||
    contentType === 'application/octet-stream' ||
    contentType === 'binary/octet-stream'
  ) {
    const pathLower = target.pathname.toLowerCase();
    if (pathLower.endsWith('.webm')) contentType = 'video/webm';
    else contentType = 'video/mp4';
  }
  out.set('Content-Type', contentType);

  out.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
