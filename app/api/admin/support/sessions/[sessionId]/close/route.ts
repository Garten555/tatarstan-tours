import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Pusher from 'pusher';

const ADMIN_ROLES = ['support_admin', 'super_admin'];

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    // Обновляем статус сессии
    const { data: updated, error } = await (serviceClient as any)
      .from('support_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closed_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Ошибка закрытия сессии:', error);
      return NextResponse.json(
        { error: 'Не удалось закрыть сессию' },
        { status: 500 }
      );
    }

    // Отправляем уведомление пользователю через Pusher
    try {
      await pusher.trigger(
        `support-chat-${sessionId}`,
        'session-closed',
        { session: updated }
      );
    } catch (pusherError) {
      console.error('Ошибка Pusher при закрытии сессии:', pusherError);
      // Не прерываем выполнение, сессия уже закрыта
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('Ошибка API закрытия сессии:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

