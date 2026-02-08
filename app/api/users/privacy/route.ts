// API для настроек приватности сообщений
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/users/privacy - Получить настройки приватности
export async function GET(request: NextRequest) {
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

    const { data: privacy, error } = await serviceClient
      .from('user_message_privacy')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Ошибка загрузки настроек приватности:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить настройки' },
        { status: 500 }
      );
    }

    // Если настройки не найдены, создаем дефолтные
    if (!privacy) {
      const { data: newPrivacy, error: createError } = await serviceClient
        .from('user_message_privacy')
        .insert({
          user_id: user.id,
          who_can_message: 'everyone',
          who_can_follow: 'everyone',
          who_can_add_friend: 'everyone',
          who_can_view_gallery: 'everyone',
          auto_accept_friends: false,
          show_online_status: true,
          show_last_seen: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Ошибка создания настроек:', createError);
        return NextResponse.json(
          { error: 'Не удалось создать настройки' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        privacy: newPrivacy,
      });
    }

    return NextResponse.json({
      success: true,
      privacy,
    });
  } catch (error: any) {
    console.error('Ошибка загрузки настроек приватности:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/privacy - Обновить настройки приватности
export async function PATCH(request: NextRequest) {
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
    const {
      who_can_message,
      who_can_follow,
      who_can_add_friend,
      who_can_view_gallery,
      auto_accept_friends,
      show_online_status,
      show_last_seen,
    } = body;

    const updateData: any = {};

    if (who_can_message !== undefined) {
      if (!['everyone', 'friends', 'nobody'].includes(who_can_message)) {
        return NextResponse.json(
          { error: 'Некорректное значение who_can_message' },
          { status: 400 }
        );
      }
      updateData.who_can_message = who_can_message;
    }

    if (who_can_follow !== undefined) {
      if (!['everyone', 'friends', 'nobody'].includes(who_can_follow)) {
        return NextResponse.json(
          { error: 'Некорректное значение who_can_follow' },
          { status: 400 }
        );
      }
      updateData.who_can_follow = who_can_follow;
    }

    if (who_can_add_friend !== undefined) {
      if (!['everyone', 'friends', 'nobody'].includes(who_can_add_friend)) {
        return NextResponse.json(
          { error: 'Некорректное значение who_can_add_friend' },
          { status: 400 }
        );
      }
      updateData.who_can_add_friend = who_can_add_friend;
    }

    if (who_can_view_gallery !== undefined) {
      if (!['everyone', 'followers', 'friends', 'nobody'].includes(who_can_view_gallery)) {
        return NextResponse.json(
          { error: 'Некорректное значение who_can_view_gallery' },
          { status: 400 }
        );
      }
      updateData.who_can_view_gallery = who_can_view_gallery;
    }

    if (auto_accept_friends !== undefined) {
      updateData.auto_accept_friends = auto_accept_friends;
    }

    if (show_online_status !== undefined) {
      updateData.show_online_status = show_online_status;
    }

    if (show_last_seen !== undefined) {
      updateData.show_last_seen = show_last_seen;
    }

    // Проверяем, существуют ли настройки
    const { data: existing } = await serviceClient
      .from('user_message_privacy')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let privacy;

    if (existing) {
      // Обновляем существующие настройки
      const { data, error } = await serviceClient
        .from('user_message_privacy')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления настроек:', error);
        return NextResponse.json(
          { error: 'Не удалось обновить настройки' },
          { status: 500 }
        );
      }

      privacy = data;
    } else {
      // Создаем новые настройки
      const { data, error } = await serviceClient
        .from('user_message_privacy')
        .insert({
          user_id: user.id,
          ...updateData,
          who_can_message: updateData.who_can_message || 'everyone',
          who_can_follow: updateData.who_can_follow || 'everyone',
          who_can_add_friend: updateData.who_can_add_friend || 'everyone',
          who_can_view_gallery: updateData.who_can_view_gallery || 'everyone',
          auto_accept_friends: updateData.auto_accept_friends ?? false,
          show_online_status: updateData.show_online_status ?? true,
          show_last_seen: updateData.show_last_seen ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания настроек:', error);
        return NextResponse.json(
          { error: 'Не удалось создать настройки' },
          { status: 500 }
        );
      }

      privacy = data;
    }

    return NextResponse.json({
      success: true,
      privacy,
    });
  } catch (error: any) {
    console.error('Ошибка обновления настроек приватности:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}










