import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

    // Ищем активную сессию пользователя (самую последнюю)
    const { data: session, error } = await serviceClient
      .from('support_sessions')
      .select('session_id, status, closed_at, closed_reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Ошибка проверки статуса сессии:', error);
      return NextResponse.json(
        { error: 'Не удалось проверить статус сессии' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      session: session || null 
    });
  } catch (error) {
    console.error('Ошибка проверки статуса сессии:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

