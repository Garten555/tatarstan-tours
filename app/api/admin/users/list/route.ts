// API для получения списка пользователей (для назначения гидов)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/admin/users/list - получить список пользователей для назначения гидов
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // Проверка авторизации
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

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (role !== 'tour_admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    // Получаем пользователей с ролями 'user' и 'guide' (оптимизировано)
    const { data: users, error } = await serviceClient
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .in('role', ['user', 'guide'])
      .order('first_name')
      .limit(100); // Ограничиваем количество для производительности

    if (error) {
      console.error('Ошибка получения пользователей:', error);
      return NextResponse.json(
        { error: 'Не удалось получить пользователей' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (error) {
    console.error('Ошибка API списка пользователей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}









