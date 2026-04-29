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

// DELETE /api/admin/support/sessions/[sessionId] - удаление сессии
export async function DELETE(
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

    const { data: sessionRow } = await serviceClient
      .from('support_sessions')
      .select('user_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    const { error: messagesError } = await serviceClient
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (messagesError) {
      console.error('Ошибка удаления сообщений:', messagesError);
      return NextResponse.json(
        { error: 'Не удалось удалить сообщения' },
        { status: 500 }
      );
    }

    const { error: sessionError } = await serviceClient
      .from('support_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (sessionError) {
      console.error('Ошибка удаления сессии:', sessionError);
      return NextResponse.json(
        { error: 'Не удалось удалить сессию' },
        { status: 500 }
      );
    }

    const userId = sessionRow?.user_id as string | undefined;

    try {
      const payloadDeleted = { sessionId, clearMessages: true };
      const payloadCleared = { sessionId };
      await pusher.trigger(`support-chat-${sessionId}`, 'session-deleted', payloadDeleted);
      await pusher.trigger(`support-chat-${sessionId}`, 'messages-cleared', payloadCleared);
      if (userId && userId !== sessionId) {
        await pusher.trigger(`support-chat-${userId}`, 'session-deleted', payloadDeleted);
        await pusher.trigger(`support-chat-${userId}`, 'messages-cleared', payloadCleared);
      }
    } catch (pusherError) {
      console.error('Ошибка Pusher при удалении сессии:', pusherError);
      // Не прерываем выполнение, сессия уже удалена
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка API удаления сессии:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

