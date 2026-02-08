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

export async function GET(request: NextRequest) {
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

    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id обязателен' },
        { status: 400 }
      );
    }

    // Загружаем все сообщения для этой сессии
    const { data: allMessages, error } = await serviceClient
      .from('chat_messages')
      .select('id, message, is_support, is_ai, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    // Фильтруем ИИ-сообщения (оставляем только сообщения где is_ai = false или null)
    const messages = (allMessages || []).filter((msg: any) => msg.is_ai !== true);

    if (error) {
      console.error('Ошибка загрузки сообщений поддержки:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить сообщения' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

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
    const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'session_id и message обязательны' },
        { status: 400 }
      );
    }

    const { data: newMessage, error } = await serviceClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: null, // Сообщение от поддержки
        message,
        is_support: true,
        is_ai: false,
      })
      .select('id, message, is_support, is_ai, created_at')
      .single();

    if (error || !newMessage) {
      console.error('Ошибка отправки сообщения:', error);
      return NextResponse.json(
        { error: 'Не удалось отправить сообщение' },
        { status: 500 }
      );
    }

    // Отправляем через Pusher
    try {
      await pusher.trigger(`support-chat-${sessionId}`, 'new-message', {
        message: newMessage,
      });
    } catch (pusherError) {
      console.error('Ошибка Pusher:', pusherError);
      // Не прерываем выполнение, сообщение уже сохранено
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
