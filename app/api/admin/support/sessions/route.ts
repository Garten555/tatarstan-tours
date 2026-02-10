import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['support_admin', 'super_admin'];

export async function GET(_request: NextRequest) {
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

    // Получаем параметр фильтрации
    const statusFilter = _request.nextUrl.searchParams.get('status') || 'active';

    // Загружаем сессии из таблицы support_sessions
    let sessionsQuery = (serviceClient as any)
      .from('support_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    // Фильтруем по статусу
    if (statusFilter === 'active') {
      sessionsQuery = sessionsQuery.eq('status', 'active');
    } else if (statusFilter === 'closed') {
      sessionsQuery = sessionsQuery.eq('status', 'closed');
    } else if (statusFilter === 'archived') {
      sessionsQuery = sessionsQuery.eq('status', 'archived');
    }

    const { data: supportSessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Ошибка загрузки сессий поддержки:', sessionsError);
      return NextResponse.json(
        { error: 'Не удалось загрузить сессии' },
        { status: 500 }
      );
    }

    // Получаем последние сообщения для каждой сессии
    const sessionIds = (supportSessions || []).map((s: any) => s.session_id);
    let lastMessagesMap = new Map<string, any>();

    if (sessionIds.length > 0) {
      const { data: messages } = await (serviceClient as any)
        .from('chat_messages')
        .select('session_id, message, created_at, is_support')
        .eq('is_ai', false)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      // Группируем по session_id и берем последнее сообщение
      (messages || []).forEach((msg: any) => {
        if (!lastMessagesMap.has(msg.session_id)) {
          lastMessagesMap.set(msg.session_id, {
            last_message: msg.message,
            last_message_at: msg.created_at,
            is_support: msg.is_support,
          });
        }
      });
    }

    // Объединяем данные
    const sessions = (supportSessions || []).map((session: any) => {
      const lastMsg = lastMessagesMap.get(session.session_id) || {};
      return {
        session_id: session.session_id,
        user_id: session.user_id,
        status: session.status,
        closed_at: session.closed_at,
        closed_by: session.closed_by,
        closed_reason: session.closed_reason,
        last_message: lastMsg.last_message || '',
        last_message_at: lastMsg.last_message_at || session.created_at,
        is_support: lastMsg.is_support || false,
      };
    });
    const userIds = sessions
      .map((s: any) => s.user_id)
      .filter(Boolean) as string[];

    const profilesMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await serviceClient
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      (profiles || []).forEach((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
        profilesMap.set(p.id, name || p.email || p.id);
      });
    }

    const result = sessions.map((session: any) => ({
      ...session,
      user_label: session.user_id ? profilesMap.get(session.user_id) || session.user_id : 'Аноним',
    }));

    return NextResponse.json({ success: true, sessions: result });
  } catch (error) {
    console.error('Ошибка сессий поддержки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}





