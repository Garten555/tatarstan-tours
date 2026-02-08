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

    const targetUserId = request.nextUrl.searchParams.get('user_id');
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }

    // Определяем порядок пользователей (меньший ID всегда user_id)
    const user1_id = user.id < targetUserId ? user.id : targetUserId;
    const user2_id = user.id < targetUserId ? targetUserId : user.id;

    // Ищем существующую дружбу
    const { data: friendship, error } = await serviceClient
      .from('user_friends')
      .select('*')
      .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
      .maybeSingle();

    if (error) {
      console.error('Ошибка проверки статуса дружбы:', error);
      return NextResponse.json(
        { error: 'Не удалось проверить статус дружбы' },
        { status: 500 }
      );
    }

    if (!friendship) {
      return NextResponse.json({
        success: true,
        friendship: null,
      });
    }

    return NextResponse.json({
      success: true,
      friendship: {
        ...friendship,
        requested_by_me: friendship.requested_by === user.id,
      },
    });
  } catch (error: any) {
    console.error('Ошибка проверки статуса дружбы:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

