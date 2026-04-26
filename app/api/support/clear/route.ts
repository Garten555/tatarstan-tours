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

    // Находим активную сессию пользователя
    const { data: session, error: sessionError } = await serviceClient
      .from('support_sessions')
      .select('session_id, status')
      .eq('session_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (sessionError) {
      console.error('Ошибка поиска сессии:', sessionError);
      return NextResponse.json(
        { error: 'Не удалось найти сессию' },
        { status: 500 }
      );
    }

    // Если активной сессии нет, просто возвращаем успех
    if (!session) {
      return NextResponse.json({ success: true, message: 'Нет активной сессии для очистки' });
    }

    // Удаляем все сообщения сессии
    const { error: messagesError } = await serviceClient
      .from('chat_messages')
      .delete()
      .eq('session_id', user.id);

    if (messagesError) {
      console.error('Ошибка удаления сообщений:', messagesError);
      return NextResponse.json(
        { error: 'Не удалось очистить сообщения' },
        { status: 500 }
      );
    }

    // Закрываем сессию (автоматически завершаем вопрос)
    const { error: closeError } = await serviceClient
      .from('support_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closed_reason: 'Пользователь очистил чат',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', user.id)
      .eq('status', 'active');

    if (closeError) {
      console.error('Ошибка закрытия сессии:', closeError);
      return NextResponse.json(
        { error: 'Не удалось закрыть сессию' },
        { status: 500 }
      );
    }

    // Отправляем уведомление через Pusher
    try {
      await pusher.trigger(
        `support-chat-${user.id}`,
        'session-deleted',
        { 
          clearMessages: true,
          sessionId: user.id
        }
      );
      await pusher.trigger(
        `support-chat-${user.id}`,
        'messages-cleared',
        { sessionId: user.id }
      );
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



