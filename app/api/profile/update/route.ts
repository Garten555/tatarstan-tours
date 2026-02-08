// API для обновления настроек профиля
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { username, bio, public_profile_enabled } = body;

    // Валидация username
    if (username !== null && username !== undefined) {
      const cleanUsername = username ? username.toLowerCase().trim() : null;

      if (cleanUsername) {
        // Длина
        if (cleanUsername.length < 3) {
          return NextResponse.json(
            { error: 'Username должен содержать минимум 3 символа' },
            { status: 400 }
          );
        }

        if (cleanUsername.length > 30) {
          return NextResponse.json(
            { error: 'Username не может быть длиннее 30 символов' },
            { status: 400 }
          );
        }

        // Формат
        const usernameRegex = /^[a-z0-9_-]+$/;
        if (!usernameRegex.test(cleanUsername)) {
          return NextResponse.json(
            { error: 'Username может содержать только латиницу, цифры, дефисы (-) и подчеркивания (_)' },
            { status: 400 }
          );
        }

        // Не может начинаться или заканчиваться дефисом или подчеркиванием
        if (/^[-_]|[-_]$/.test(cleanUsername)) {
          return NextResponse.json(
            { error: 'Username не может начинаться или заканчиваться дефисом или подчеркиванием' },
            { status: 400 }
          );
        }

        // Не может содержать два подряд идущих дефиса или подчеркивания
        if (/[-_]{2,}/.test(cleanUsername)) {
          return NextResponse.json(
            { error: 'Username не может содержать два подряд идущих дефиса или подчеркивания' },
            { status: 400 }
          );
        }

        // Зарезервированные слова
        const reservedWords = [
          'admin', 'administrator', 'moderator', 'support', 'api', 'www', 'mail', 'ftp', 
          'root', 'system', 'test', 'null', 'undefined', 'true', 'false', 'new', 'edit', 
          'delete', 'create', 'update', 'settings', 'profile', 'user', 'users', 'tour', 
          'tours', 'booking', 'bookings', 'diary', 'diaries', 'passport', 'auth', 'login', 
          'logout', 'register', 'signup', 'signin', 'signout', 'password', 'reset', 'verify',
          'confirm', 'activate', 'deactivate', 'ban', 'unban', 'block', 'unblock'
        ];
        if (reservedWords.includes(cleanUsername)) {
          return NextResponse.json(
            { error: 'Этот username зарезервирован и недоступен' },
            { status: 400 }
          );
        }

        // Проверяем уникальность (если username изменился)
        const { data: currentProfile } = await serviceClient
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (currentProfile?.username !== cleanUsername) {
          const { data: existingProfile } = await serviceClient
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

          if (existingProfile) {
            return NextResponse.json(
              { error: 'Этот username уже занят' },
              { status: 400 }
            );
          }
        }
      }
    }

    if (public_profile_enabled && !username) {
      return NextResponse.json(
        { error: 'Для публичного профиля необходимо указать username' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: 'Описание не может быть длиннее 500 символов' },
        { status: 400 }
      );
    }

    // Обновляем профиль
    const updateData: any = {};
    if (username !== undefined) {
      updateData.username = username ? username.toLowerCase().trim() : null;
    }
    if (bio !== undefined) {
      updateData.bio = bio || null;
    }
    if (public_profile_enabled !== undefined) {
      updateData.public_profile_enabled = public_profile_enabled;
    }

    const { data: updatedProfile, error: updateError } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('id, username, bio, public_profile_enabled, status_level, reputation_score')
      .single();

    if (updateError) {
      console.error('[Profile Update API] Error:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить профиль', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('[Profile Update API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

