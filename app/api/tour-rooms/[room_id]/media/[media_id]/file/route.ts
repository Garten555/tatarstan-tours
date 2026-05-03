// Прокси файла медиа комнаты (обход CORS при сборке ZIP и скачивании из браузера)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { S3_CONFIG } from '@/lib/s3/client';

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

function isTrustedMediaUrl(mediaUrl: string): boolean {
  try {
    const u = new URL(mediaUrl);
    if (u.protocol !== 'https:') return false;
    const pub = (process.env.NEXT_PUBLIC_S3_PUBLIC_URL || process.env.S3_ENDPOINT || '').replace(/\/$/, '');
    if (pub && S3_CONFIG.bucket) {
      const prefix = `${pub}/${S3_CONFIG.bucket}/`;
      if (mediaUrl.startsWith(prefix)) return true;
    }
    return isAllowedHostname(u.hostname);
  } catch {
    return false;
  }
}

// GET /api/tour-rooms/[room_id]/media/[media_id]/file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ room_id: string; media_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { room_id, media_id } = await params;

    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', room_id)
      .single();

    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json({ error: 'У вас нет доступа к этой комнате' }, { status: 403 });
    }

    const { data: media, error: mediaError } = await serviceClient
      .from('tour_room_media')
      .select('id, room_id, media_url, mime_type')
      .eq('id', media_id)
      .eq('room_id', room_id)
      .single();

    if (mediaError || !media?.media_url) {
      return NextResponse.json({ error: 'Медиа не найдено' }, { status: 404 });
    }

    if (!isTrustedMediaUrl(media.media_url)) {
      console.warn('[room-media-file] rejected URL host:', media.media_url.slice(0, 120));
      return NextResponse.json({ error: 'URL файла не разрешён' }, { status: 403 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(media.media_url, {
        cache: 'no-store',
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (compatible; turrrr-room-media-proxy/1.0; +https://nodejs.org/api/globals.html#fetch)',
        },
      });
    } catch (e) {
      console.error('[room-media-file] fetch failed:', e);
      return NextResponse.json({ error: 'Не удалось получить файл' }, { status: 502 });
    }

    if (!upstream.ok) {
      const snippet = await upstream.text().catch(() => '');
      console.error('[room-media-file] upstream', upstream.status, snippet.slice(0, 300));
      return NextResponse.json(
        { error: 'Файл недоступен на хранилище', status: upstream.status },
        { status: 502 }
      );
    }

    const ct =
      upstream.headers.get('content-type') ||
      (typeof media.mime_type === 'string' ? media.mime_type : '') ||
      'application/octet-stream';

    const outHeaders = new Headers();
    outHeaders.set('Content-Type', ct);
    outHeaders.set('Cache-Control', 'private, max-age=120');

    return new NextResponse(upstream.body, {
      status: 200,
      headers: outHeaders,
    });
  } catch (error) {
    console.error('[room-media-file]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
