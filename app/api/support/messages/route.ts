import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import Pusher from 'pusher';

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

    const sessionId = user.id;
    const mode = request.nextUrl.searchParams.get('mode') || 'support';
    
    // Для режима поддержки загружаем только сообщения активной сессии
    let activeSessionId = sessionId;
    if (mode === 'support') {
      const { data: activeSession } = await serviceClient
        .from('support_sessions')
        .select('session_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeSession) {
        activeSessionId = activeSession.session_id;
        // Загружаем только сообщения, созданные после создания этой сессии
        // Это гарантирует, что старые сообщения из предыдущих сессий не попадут
      } else {
        // Если нет активной сессии, возвращаем пустой массив
        return NextResponse.json({ success: true, messages: [] });
      }
    }
    
    // Для режима поддержки получаем время создания сессии для дополнительной фильтрации
    let sessionCreatedAt: string | null = null;
    if (mode === 'support') {
      const { data: sessionInfo } = await serviceClient
        .from('support_sessions')
        .select('created_at')
        .eq('session_id', activeSessionId)
        .maybeSingle();
      
      if (sessionInfo?.created_at) {
        sessionCreatedAt = sessionInfo.created_at;
      }
    }
    
    let query = serviceClient
      .from('chat_messages')
      .select('id, message, is_support, is_ai, created_at')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true });

    // Для режима поддержки фильтруем только сообщения, созданные после создания сессии
    if (mode === 'support' && sessionCreatedAt) {
      query = query.gte('created_at', sessionCreatedAt);
    }

    if (mode === 'ai') {
      query = query.eq('is_ai', true);
    } else {
      query = query.eq('is_ai', false);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Ошибка загрузки чата поддержки:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить сообщения' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (error) {
    console.error('Ошибка чата поддержки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((limiter.resetTime - Date.now()) / 1000).toString() } }
      );
    }

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

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      );
    }
    if (message.length > 1500) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное' },
        { status: 400 }
      );
    }

    // Ищем активную сессию пользователя
    let sessionId: string;
    const { data: activeSession } = await serviceClient
      .from('support_sessions')
      .select('session_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      // Используем активную сессию
      sessionId = activeSession.session_id;
    } else {
      // Нет активной сессии - создаем новую
      sessionId = `${user.id}-${Date.now()}`;
      
      // Закрываем все предыдущие активные сессии (на всякий случай)
      await serviceClient
        .from('support_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const { error: createSessionError } = await serviceClient
        .from('support_sessions')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          status: 'active',
        });

      if (createSessionError) {
        console.error('Ошибка создания новой сессии:', createSessionError);
        return NextResponse.json(
          { error: 'Не удалось создать новую сессию' },
          { status: 500 }
        );
      }
      
      // Отправляем через Pusher уведомление о новой сессии
      try {
        await pusher.trigger(
          `support-chat-${user.id}`,
          'new-session-created',
          { newSessionId: sessionId }
        );
      } catch (pusherError) {
        console.error('Ошибка Pusher при создании новой сессии:', pusherError);
      }
    }

    const { data, error } = await serviceClient
      .from('chat_messages')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        message,
        is_support: false,
        is_ai: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка отправки сообщения:', error);
      return NextResponse.json(
        { error: 'Не удалось отправить сообщение' },
        { status: 500 }
      );
    }

    // Отправляем через Pusher для real-time обновления
    // Отправляем в канал пользователя (user.id) - админ подписан на этот канал через sessionId
    try {
      const userChannel = `support-chat-${user.id}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[API User] Sending message via Pusher to channel:', userChannel);
      }
      
      // Отправляем в канал пользователя (для самого пользователя и для админа)
      // Админ подписан на канал support-chat-${sessionId}, где sessionId = user.id
      await pusher.trigger(userChannel, 'new-message', { message: data });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[API User] Message sent via Pusher successfully');
      }
    } catch (pusherError) {
      console.error('[API User] Ошибка отправки через Pusher:', pusherError);
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error('Ошибка чата поддержки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}




