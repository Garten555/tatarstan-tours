// API подписок: отдельная кнопка «Подписаться» отключена — подписка только через заявку в друзья.
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { removeFollowBetween } from '@/lib/social/friend-subscribers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { username } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const cleanUsername = decodeURIComponent(
      username.startsWith('@') ? username.slice(1) : username
    ).trim();

    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('id, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    let finalTargetProfile = targetProfile;
    if (
      !finalTargetProfile &&
      cleanUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ) {
      const { data: profileById } = await serviceClient
        .from('profiles')
        .select('id, username')
        .eq('id', cleanUsername)
        .maybeSingle();
      finalTargetProfile = profileById;
    }

    if (!finalTargetProfile) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (finalTargetProfile.id === user.id) {
      return NextResponse.json({ error: 'Нельзя подписаться на самого себя' }, { status: 400 });
    }

    const { data: existingFollow } = await serviceClient
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', finalTargetProfile.id)
      .maybeSingle();

    if (existingFollow) {
      await removeFollowBetween(serviceClient, user.id, finalTargetProfile.id);
      return NextResponse.json({
        success: true,
        following: false,
        message: 'Подписка удалена',
      });
    }

    return NextResponse.json(
      {
        error:
          'Подписка доступна только через заявку в друзья. После принятия заявки вы появитесь в подписчиках.',
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    console.error('[Follow API] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
