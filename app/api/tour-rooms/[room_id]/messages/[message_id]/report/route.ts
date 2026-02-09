import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string; message_id: string }> }
) {
  try {
    const { room_id, message_id } = await params;
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
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    const [roomResult, participantResult, profileResult] = await Promise.all([
      serviceClient
        .from('tour_rooms')
        .select('guide_id')
        .eq('id', room_id)
        .single(),
      serviceClient
        .from('tour_room_participants')
        .select('id')
        .eq('room_id', room_id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single(),
    ]);

    const { data: room } = roomResult;
    const { data: participant } = participantResult;
    const { data: profile } = profileResult;

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json({ error: 'У вас нет доступа к этой комнате' }, { status: 403 });
    }

    const { data: updated, error } = await serviceClient
      .from('tour_room_messages')
      .update({
        is_reported: true,
        reported_at: new Date().toISOString(),
        reported_by: user.id,
        report_reason: reason,
      })
      .eq('id', message_id)
      .eq('room_id', room_id)
      .select('id')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Не удалось отправить жалобу' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка жалобы на сообщение:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
















