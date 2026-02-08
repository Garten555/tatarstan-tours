// API для управления друзьями
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/users/friends - Получить список друзей
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

    const status = searchParams.get('status') || 'accepted'; // accepted, pending, blocked

    // Получаем друзей пользователя
    const { data: friendships, error } = await serviceClient
      .from('user_friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        requested_by,
        created_at,
        accepted_at,
        friend:profiles!user_friends_friend_id_fkey(
          id,
          username,
          display_name,
          first_name,
          last_name,
          avatar_url,
          bio,
          status_level
        ),
        user:profiles!user_friends_user_id_fkey(
          id,
          username,
          display_name,
          first_name,
          last_name,
          avatar_url,
          bio,
          status_level
        )
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки друзей:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить друзей' },
        { status: 500 }
      );
    }

    // Преобразуем данные: определяем, кто является другом
    const friends = (friendships || []).map((friendship: any) => {
      const isUser1 = friendship.user_id === user.id;
      const friend = isUser1 ? friendship.friend : friendship.user;
      return {
        id: friendship.id,
        friend_id: friend.id,
        friend: friend,
        status: friendship.status,
        requested_by: friendship.requested_by,
        created_at: friendship.created_at,
        accepted_at: friendship.accepted_at,
        is_requested_by_me: friendship.requested_by === user.id,
      };
    });

    return NextResponse.json({
      success: true,
      friends,
    });
  } catch (error: any) {
    console.error('Ошибка загрузки друзей:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/users/friends - Отправить запрос на дружбу или принять/отклонить
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

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

    const body = await request.json();
    const { friend_id, action } = body; // action: 'request', 'accept', 'reject', 'block', 'unblock', 'remove'

    if (!friend_id) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }

    if (friend_id === user.id) {
      return NextResponse.json(
        { error: 'Нельзя добавить в друзья самого себя' },
        { status: 400 }
      );
    }

    // Определяем порядок пользователей (меньший ID всегда user_id)
    const user1_id = user.id < friend_id ? user.id : friend_id;
    const user2_id = user.id < friend_id ? friend_id : user.id;

    // Ищем существующую дружбу
    const { data: existingFriendship } = await serviceClient
      .from('user_friends')
      .select('*')
      .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
      .maybeSingle();

    if (action === 'request') {
      // Проверяем настройки приватности целевого пользователя
      const { data: privacySettings } = await serviceClient
        .from('user_message_privacy')
        .select('who_can_add_friend')
        .eq('user_id', friend_id)
        .maybeSingle();

      const whoCanAddFriend = privacySettings?.who_can_add_friend || 'everyone';

      if (whoCanAddFriend === 'nobody') {
        return NextResponse.json(
          { error: 'Этот пользователь отключил запросы на дружбу' },
          { status: 403 }
        );
      }

      if (whoCanAddFriend === 'friends') {
        // Проверяем, являются ли мы уже друзьями (тогда можно добавить в друзья)
        const user1_id = user.id < friend_id ? user.id : friend_id;
        const user2_id = user.id < friend_id ? friend_id : user.id;
        
        const { data: existingFriendshipCheck } = await serviceClient
          .from('user_friends')
          .select('status')
          .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!existingFriendshipCheck) {
          return NextResponse.json(
            { error: 'Только друзья могут добавить этого пользователя в друзья' },
            { status: 403 }
          );
        }
      }

      // Отправка запроса на дружбу
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return NextResponse.json(
            { error: 'Вы уже друзья' },
            { status: 400 }
          );
        }
        if (existingFriendship.status === 'blocked') {
          return NextResponse.json(
            { error: 'Пользователь заблокирован' },
            { status: 400 }
          );
        }
        if (existingFriendship.status === 'pending') {
          return NextResponse.json(
            { error: 'Запрос уже отправлен' },
            { status: 400 }
          );
        }
      }

      const { data: friendship, error } = await serviceClient
        .from('user_friends')
        .insert({
          user_id: user1_id,
          friend_id: user2_id,
          status: 'pending',
          requested_by: user.id,
        })
        .select(`
          *,
          friend:profiles!user_friends_friend_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Ошибка создания запроса на дружбу:', error);
        return NextResponse.json(
          { error: 'Не удалось отправить запрос' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        friendship,
      });
    } else if (action === 'accept') {
      // Принятие запроса
      if (!existingFriendship || existingFriendship.status !== 'pending') {
        return NextResponse.json(
          { error: 'Запрос на дружбу не найден' },
          { status: 400 }
        );
      }

      if (existingFriendship.requested_by === user.id) {
        return NextResponse.json(
          { error: 'Нельзя принять свой собственный запрос' },
          { status: 400 }
        );
      }

      // Получаем информацию о пользователе, который отправил запрос
      const requesterId = existingFriendship.requested_by;
      const { data: requesterProfile } = await serviceClient
        .from('profiles')
        .select('id, username, first_name, last_name')
        .eq('id', requesterId)
        .single();

      const { data: friendship, error } = await serviceClient
        .from('user_friends')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', existingFriendship.id)
        .select(`
          *,
          friend:profiles!user_friends_friend_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Ошибка принятия запроса:', error);
        return NextResponse.json(
          { error: 'Не удалось принять запрос' },
          { status: 500 }
        );
      }

      // Создаем уведомление для пользователя, который отправил запрос
      if (requesterProfile) {
        const requesterName = requesterProfile.first_name && requesterProfile.last_name
          ? `${requesterProfile.first_name} ${requesterProfile.last_name}`
          : requesterProfile.username || 'Пользователь';
        
        const { data: currentUserProfile } = await serviceClient
          .from('profiles')
          .select('id, username, first_name, last_name')
          .eq('id', user.id)
          .single();

        const currentUserName = currentUserProfile?.first_name && currentUserProfile?.last_name
          ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}`
          : currentUserProfile?.username || 'Пользователь';

        const { error: notificationError } = await serviceClient
          .from('notifications')
          .insert({
            user_id: requesterId,
            title: 'Запрос на дружбу принят',
            body: `${currentUserName} принял(а) ваш запрос на дружбу`,
            type: 'friendship',
          });
        
        if (notificationError) {
          console.error('Ошибка создания уведомления о дружбе:', notificationError);
        }
      }

      return NextResponse.json({
        success: true,
        friendship,
      });
    } else if (action === 'reject' || action === 'remove') {
      // Отклонение запроса или удаление из друзей
      if (!existingFriendship) {
        return NextResponse.json(
          { error: 'Дружба не найдена' },
          { status: 400 }
        );
      }

      const { error } = await serviceClient
        .from('user_friends')
        .delete()
        .eq('id', existingFriendship.id);

      if (error) {
        console.error('Ошибка удаления дружбы:', error);
        return NextResponse.json(
          { error: 'Не удалось удалить дружбу' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    } else if (action === 'block') {
      // Блокировка пользователя
      if (existingFriendship) {
        const { error } = await serviceClient
          .from('user_friends')
          .update({ status: 'blocked' })
          .eq('id', existingFriendship.id);

        if (error) {
          console.error('Ошибка блокировки:', error);
          return NextResponse.json(
            { error: 'Не удалось заблокировать пользователя' },
            { status: 500 }
          );
        }
      } else {
        const { error } = await serviceClient
          .from('user_friends')
          .insert({
            user_id: user1_id,
            friend_id: user2_id,
            status: 'blocked',
            requested_by: user.id,
          });

        if (error) {
          console.error('Ошибка блокировки:', error);
          return NextResponse.json(
            { error: 'Не удалось заблокировать пользователя' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
      });
    } else if (action === 'unblock') {
      // Разблокировка пользователя
      if (!existingFriendship || existingFriendship.status !== 'blocked') {
        return NextResponse.json(
          { error: 'Пользователь не заблокирован' },
          { status: 400 }
        );
      }

      const { error } = await serviceClient
        .from('user_friends')
        .delete()
        .eq('id', existingFriendship.id);

      if (error) {
        console.error('Ошибка разблокировки:', error);
        return NextResponse.json(
          { error: 'Не удалось разблокировать пользователя' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Неизвестное действие' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Ошибка управления друзьями:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}










