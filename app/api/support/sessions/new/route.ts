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

    // Закрываем все предыдущие активные сессии пользователя
    const { error: closeOldSessionsError } = await serviceClient
      .from('support_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (closeOldSessionsError) {
      console.error('Ошибка закрытия старых сессий:', closeOldSessionsError);
      // Не прерываем выполнение, продолжаем создание новой сессии
    }

    // Создаем новую сессию с новым уникальным session_id
    const newSessionId = `${user.id}-${Date.now()}`;

    // Создаём новую сессию
    const { error: insertError } = await serviceClient
      .from('support_sessions')
      .insert({
        session_id: newSessionId,
        user_id: user.id,
        status: 'active',
      });

    if (insertError) {
      console.error('Ошибка создания сессии:', insertError);
      return NextResponse.json(
        { error: 'Не удалось создать сессию' },
        { status: 500 }
      );
    }

    // Отправляем через Pusher уведомление о новой сессии
    try {
      await pusher.trigger(
        `support-chat-${user.id}`,
        'new-session-created',
        { newSessionId }
      );
    } catch (pusherError) {
      console.error('Ошибка Pusher при создании новой сессии:', pusherError);
      // Не прерываем выполнение
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка создания новой сессии:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

