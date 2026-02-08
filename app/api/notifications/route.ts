import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { data: notifications, error } = await serviceClient
      .from('notifications')
      .select('id, user_id, title, body, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Не удалось загрузить уведомления' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notifications: notifications || [] });
  } catch (error) {
    console.error('Ошибка API уведомлений:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
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
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const message = typeof body?.body === 'string' ? body.body.trim() : null;
    const type = typeof body?.type === 'string' ? body.type.trim() : 'info';

    if (!title) {
      return NextResponse.json({ error: 'Заголовок обязателен' }, { status: 400 });
    }

    const { data: notification, error } = await serviceClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        body: message,
        type,
      })
      .select('id, user_id, title, body, type, created_at')
      .single();

    if (error || !notification) {
      return NextResponse.json({ error: 'Не удалось сохранить уведомление' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Ошибка API уведомлений:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { error } = await serviceClient
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Не удалось очистить уведомления' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка очистки уведомлений:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}













