// API для проверки доступности username
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

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username не указан' },
        { status: 400 }
      );
    }

    const cleanUsername = username.toLowerCase().trim();

    // Валидация формата
    if (cleanUsername.length < 3) {
      return NextResponse.json({
        available: false,
        reason: 'Username должен содержать минимум 3 символа',
      });
    }

    if (cleanUsername.length > 30) {
      return NextResponse.json({
        available: false,
        reason: 'Username не может быть длиннее 30 символов',
      });
    }

    // Только латиница, цифры, дефисы и подчеркивания
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        reason: 'Используйте только латиницу, цифры, дефисы (-) и подчеркивания (_)',
      });
    }

    // Не может начинаться или заканчиваться дефисом или подчеркиванием
    if (/^[-_]|[-_]$/.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        reason: 'Username не может начинаться или заканчиваться дефисом или подчеркиванием',
      });
    }

    // Не может содержать два подряд идущих дефиса или подчеркивания
    if (/[-_]{2,}/.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        reason: 'Username не может содержать два подряд идущих дефиса или подчеркивания',
      });
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
      return NextResponse.json({
        available: false,
        reason: 'Этот username зарезервирован и недоступен',
      });
    }

    // Проверяем, занят ли username другим пользователем
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id, username')
      .eq('username', cleanUsername)
      .maybeSingle();

    // Если username занят другим пользователем - недоступен
    if (existingProfile && existingProfile.id !== user.id) {
      return NextResponse.json({
        available: false,
        reason: 'Этот username уже занят',
      });
    }

    // Если username принадлежит текущему пользователю - доступен
    if (existingProfile && existingProfile.id === user.id) {
      return NextResponse.json({
        available: true,
        reason: 'Это ваш текущий username',
      });
    }

    // Username свободен
    return NextResponse.json({
      available: true,
      reason: 'Username доступен',
    });
  } catch (error: any) {
    console.error('[Check Username API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

