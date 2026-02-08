// API для поиска пользователей
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);

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

    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const usernameOnly = searchParams.get('username_only') === 'true';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        total: 0,
      });
    }

    // Убираем @ если есть
    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;

    // Ищем пользователей
    let queryBuilder = serviceClient
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        first_name,
        last_name,
        avatar_url,
        bio,
        public_profile_enabled,
        status_level,
        reputation_score
      `)
      .neq('id', user.id); // Исключаем текущего пользователя

    if (usernameOnly) {
      // Поиск только по username
      queryBuilder = queryBuilder.ilike('username', `%${cleanQuery}%`);
    } else {
      // Поиск по всем полям, только публичные профили
      queryBuilder = queryBuilder
        .eq('public_profile_enabled', true)
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%,first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%`);
    }

    const { data: users, error } = await queryBuilder
      .order('reputation_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Ошибка поиска пользователей:', error);
      return NextResponse.json(
        { error: 'Не удалось выполнить поиск' },
        { status: 500 }
      );
    }

    // Получаем общее количество результатов
    let countQuery = serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('id', user.id);

    if (usernameOnly) {
      countQuery = countQuery.ilike('username', `%${cleanQuery}%`);
    } else {
      countQuery = countQuery
        .eq('public_profile_enabled', true)
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%,first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      users: users || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error('Ошибка поиска пользователей:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}










