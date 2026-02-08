// API для подписок на пользователей
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/users/[username]/follow - Подписаться/отписаться
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { username } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Убираем @ если есть и декодируем username
    const cleanUsername = decodeURIComponent(
      username.startsWith('@') ? username.slice(1) : username
    ).trim();

    // Получаем профиль текущего пользователя для проверки роли
    const { data: currentUserProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = currentUserProfile?.role && 
      ['super_admin', 'tour_admin', 'support_admin'].includes(currentUserProfile.role);

    // Получаем профиль пользователя, на которого хотим подписаться
    // Пробуем найти по username (с учетом регистра)
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('id, username, public_profile_enabled')
      .ilike('username', cleanUsername)
      .maybeSingle();

    // Если не нашли по username, пробуем найти по id (если передан id)
    let finalTargetProfile = targetProfile;
    if (!finalTargetProfile && cleanUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: profileById } = await serviceClient
        .from('profiles')
        .select('id, username, public_profile_enabled')
        .eq('id', cleanUsername)
        .maybeSingle();
      finalTargetProfile = profileById;
    }

    if (!finalTargetProfile) {
      console.error('[Follow API] User not found:', { cleanUsername, username });
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (finalTargetProfile.id === user.id) {
      return NextResponse.json(
        { error: 'Нельзя подписаться на самого себя' },
        { status: 400 }
      );
    }

    // Проверяем, подписан ли уже
    const { data: existingFollow } = await serviceClient
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', finalTargetProfile.id)
      .maybeSingle();

    if (existingFollow) {
      // Отписываемся
      const { error: deleteError } = await serviceClient
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followed_id', finalTargetProfile.id);

      if (deleteError) {
        console.error('[Follow API] Error unfollowing:', deleteError);
        return NextResponse.json(
          { error: 'Не удалось отписаться' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        following: false,
        message: 'Вы отписались',
      });
    } else {
      // Админы могут подписываться независимо от настроек приватности
      if (!isAdmin) {
        // Проверяем настройки приватности целевого пользователя
        const { data: privacySettings } = await serviceClient
          .from('user_message_privacy')
          .select('who_can_follow')
          .eq('user_id', finalTargetProfile.id)
          .maybeSingle();

        const whoCanFollow = privacySettings?.who_can_follow || 'everyone';

        if (whoCanFollow === 'nobody') {
          return NextResponse.json(
            { error: 'Этот пользователь отключил подписки' },
            { status: 403 }
          );
        }

        if (whoCanFollow === 'friends') {
          // Проверяем, являются ли мы друзьями
          const user1_id = user.id < finalTargetProfile.id ? user.id : finalTargetProfile.id;
          const user2_id = user.id < finalTargetProfile.id ? finalTargetProfile.id : user.id;
          
          const { data: friendship } = await serviceClient
            .from('user_friends')
            .select('status')
            .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
            .eq('status', 'accepted')
            .maybeSingle();

          if (!friendship) {
            return NextResponse.json(
              { error: 'Только друзья могут подписаться на этого пользователя' },
              { status: 403 }
            );
          }
        }
      }

      // Подписываемся
      const { error: insertError } = await serviceClient
        .from('user_follows')
        .insert({
          follower_id: user.id,
          followed_id: finalTargetProfile.id,
        });

      if (insertError) {
        console.error('[Follow API] Error following:', insertError);
        return NextResponse.json(
          { error: 'Не удалось подписаться' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        following: true,
        message: 'Вы подписались',
      });
    }
  } catch (error: any) {
    console.error('[Follow API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



















