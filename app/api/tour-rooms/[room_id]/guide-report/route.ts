import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** POST — участник комнаты отправляет жалобу на гида этой комнаты. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const { room_id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 2000) : null;

    const { data: room, error: roomErr } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', room_id)
      .single();

    if (roomErr || !room?.guide_id) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    if (room.guide_id === user.id) {
      return NextResponse.json({ error: 'Гид не может отправить жалобу на себя' }, { status: 400 });
    }

    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: 'Жалобу может отправить только участник комнаты' }, { status: 403 });
    }

    const { error: insErr } = await serviceClient.from('guide_reports').insert({
      guide_id: room.guide_id,
      reporter_id: user.id,
      room_id,
      reason: reason || null,
      status: 'open',
    });

    if (insErr) {
      if (insErr.code === '42P01' || insErr.message?.includes('guide_reports')) {
        return NextResponse.json(
          {
            error:
              'Таблица guide_reports не создана. Выполните SQL из database/migrations/008_guide_reports.sql в Supabase.',
          },
          { status: 503 }
        );
      }
      console.error('[guide-report]', insErr);
      return NextResponse.json({ error: 'Не удалось сохранить жалобу' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка жалобы на гида:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
