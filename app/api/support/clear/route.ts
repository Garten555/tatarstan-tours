// API для очистки чата поддержки пользователем (закрывает сессию)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
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

    // Активная сессия ищется по user_id; session_id в БД — это user.id или `${user.id}-${timestamp}`
    const { data: session, error: sessionError } = await serviceClient
      .from('support_sessions')
      .select('session_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('Ошибка поиска сессии:', sessionError);
      return NextResponse.json(
        { error: 'Не удалось найти сессию' },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json({ success: true, message: 'Нет активной сессии для очистки' });
    }

    const chatSessionId = session.session_id;

    const { error: messagesError } = await serviceClient
      .from('chat_messages')
      .delete()
      .eq('session_id', chatSessionId);

    if (messagesError) {
      console.error('Ошибка удаления сообщений:', messagesError);
      return NextResponse.json(
        { error: 'Не удалось очистить сообщения' },
        { status: 500 }
      );
    }

    const { error: closeError } = await serviceClient
      .from('support_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closed_reason: 'Пользователь очистил чат',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', chatSessionId)
      .eq('status', 'active');

    if (closeError) {
      console.error('Ошибка закрытия сессии:', closeError);
      return NextResponse.json(
        { error: 'Не удалось закрыть сессию' },
        { status: 500 }
      );
    }

    // Канал клиента — always support-chat-${user.id}; второй канал — для админки по session_id
    try {
      await pusher.trigger(`support-chat-${user.id}`, 'session-closed', {
        session: { status: 'closed', session_id: chatSessionId },
      });
      await pusher.trigger(`support-chat-${user.id}`, 'messages-cleared', { sessionId: chatSessionId });
      await pusher.trigger(`support-chat-${chatSessionId}`, 'session-closed', {
        session: { status: 'closed', session_id: chatSessionId },
      });
      await pusher.trigger(`support-chat-${chatSessionId}`, 'messages-cleared', { sessionId: chatSessionId });
    } catch (pusherError) {
      console.error('Ошибка Pusher при очистке чата:', pusherError);
      // Не прерываем выполнение, чат уже очищен
    }

    return NextResponse.json({ 
      success: true,
      message: 'Чат очищен, сессия закрыта'
    });
  } catch (error) {
    console.error('Ошибка API очистки чата:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



