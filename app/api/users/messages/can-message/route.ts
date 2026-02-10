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

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Нельзя отправить сообщение самому себе' },
        { status: 400 }
      );
    }

    // Получаем настройки приватности целевого пользователя
    const { data: privacySettings } = await serviceClient
      .from('user_message_privacy')
      .select('who_can_message')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const whoCanMessage = privacySettings?.who_can_message || 'everyone';

    if (whoCanMessage === 'nobody') {
      return NextResponse.json({
        success: true,
        canMessage: false,
        reason: 'Пользователь запретил получение сообщений',
      });
    }

    if (whoCanMessage === 'friends') {
      // Проверяем, друзья ли мы
      const user1_id = user.id < targetUserId ? user.id : targetUserId;
      const user2_id = user.id < targetUserId ? targetUserId : user.id;

      const { data: friendship } = await serviceClient
        .from('user_friends')
        .select('status')
        .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json({
          success: true,
          canMessage: false,
          reason: 'Только друзья могут отправлять сообщения этому пользователю',
        });
      }
    }

    return NextResponse.json({
      success: true,
      canMessage: true,
    });
  } catch (error: any) {
    console.error('Ошибка проверки возможности отправки сообщения:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



