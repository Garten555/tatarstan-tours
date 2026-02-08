import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';

// POST - создание апелляции
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

    // Проверяем, что пользователь забанен
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_banned, ban_reason')
      .eq('id', user.id)
      .single();

    if (!profile?.is_banned) {
      return NextResponse.json({ error: 'Вы не забанены' }, { status: 400 });
    }

    const body = await request.json();
    const rawAppealText = typeof body.appeal_text === 'string' ? body.appeal_text.trim() : '';
    
    // Базовая защита от XSS - удаляем потенциально опасные символы
    const appealText = sanitizeText(rawAppealText);

    if (!appealText || appealText.length < 10) {
      return NextResponse.json({ error: 'Текст апелляции должен содержать минимум 10 символов' }, { status: 400 });
    }

    if (appealText.length > 2000) {
      return NextResponse.json({ error: 'Текст апелляции не должен превышать 2000 символов' }, { status: 400 });
    }

    // Проверяем, нет ли уже активной апелляции
    const { data: existingAppeal } = await serviceClient
      .from('ban_appeals')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'reviewing'])
      .maybeSingle();

    if (existingAppeal) {
      return NextResponse.json({ error: 'У вас уже есть активная апелляция' }, { status: 400 });
    }

    // Создаём апелляцию
    const { data: appeal, error: insertError } = await serviceClient
      .from('ban_appeals')
      .insert({
        user_id: user.id,
        ban_reason: profile.ban_reason,
        appeal_text: appealText,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !appeal) {
      console.error('Ошибка создания апелляции:', insertError);
      return NextResponse.json({ error: 'Не удалось создать апелляцию' }, { status: 500 });
    }

    return NextResponse.json({ success: true, appeal });
  } catch (error) {
    console.error('Ошибка API апелляции:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// GET - получение апелляций пользователя
export async function GET(request: NextRequest) {
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

    // Получаем роль пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    const isAdmin = role && ['super_admin', 'support_admin'].includes(role);

    let query = serviceClient
      .from('ban_appeals')
      .select('*')
      .order('created_at', { ascending: false });

    // Если не админ, показываем только свои апелляции
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: appeals, error } = await query;

    if (error) {
      console.error('Ошибка получения апелляций:', error);
      return NextResponse.json({ error: 'Не удалось получить апелляции' }, { status: 500 });
    }

    return NextResponse.json({ success: true, appeals });
  } catch (error) {
    console.error('Ошибка API апелляции:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

