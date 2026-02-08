// API для получения профиля текущего пользователя
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Получаем профиль
    const { data: profile, error } = await serviceClient
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        middle_name,
        phone,
        role,
        avatar_url,
        avatar_path,
        username,
        bio,
        public_profile_enabled,
        status_level,
        reputation_score,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Profile API] Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Не удалось получить профиль' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

