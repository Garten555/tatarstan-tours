// API для работы с дневниками путешествий
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CreateDiaryRequest } from '@/types';

// GET /api/diaries - Получить дневники пользователя или публичные дневники
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);

    const { data: { user } } = await supabase.auth.getUser();

    // Параметры запроса
    const userId = searchParams.get('user_id'); // Фильтр по пользователю
    const status = searchParams.get('status'); // draft, published, private
    const visibility = searchParams.get('visibility'); // private, friends, public
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = serviceClient
      .from('travel_diaries')
      .select(`
        *,
        user:profiles(id, username, avatar_url, public_profile_enabled),
        tour:tours(id, title, slug, cover_image, category)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Если запрашиваем дневники конкретного пользователя
    if (userId) {
      if (user?.id === userId) {
        // Свои дневники - показываем все
        query = query.eq('user_id', userId);
      } else {
        // Чужие дневники - только опубликованные и публичные
        query = query.eq('user_id', userId)
          .eq('status', 'published')
          .eq('visibility', 'public');
      }
    } else if (user) {
      // Если авторизован - показываем свои + публичные других
      query = query.or(`user_id.eq.${user.id},and(status.eq.published,visibility.eq.public)`);
    } else {
      // Если не авторизован - только публичные
      query = query.eq('status', 'published').eq('visibility', 'public');
    }

    // Дополнительные фильтры
    if (status) {
      query = query.eq('status', status);
    }
    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    const { data: diaries, error } = await query;

    if (error) {
      console.error('[Diaries API] Error fetching diaries:', error);
      return NextResponse.json(
        { error: 'Не удалось получить дневники' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      diaries: diaries || [],
    });
  } catch (error: any) {
    console.error('[Diaries API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/diaries - Создать новый дневник
export async function POST(request: NextRequest) {
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

    const body: CreateDiaryRequest = await request.json();
    const {
      title,
      content,
      tour_id,
      booking_id,
      travel_date,
      media_items = [],
      location_data,
      visibility = 'private',
      auto_generated = false,
    } = body;

    // Валидация
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Название дневника должно содержать минимум 3 символа' },
        { status: 400 }
      );
    }

    // Проверка доступа к туру (если указан)
    if (tour_id) {
      const { data: booking } = await serviceClient
        .from('bookings')
        .select('id, user_id, status')
        .eq('tour_id', tour_id)
        .eq('user_id', user.id)
        .eq('id', booking_id || '')
        .maybeSingle();

      if (booking_id && !booking) {
        return NextResponse.json(
          { error: 'Бронирование не найдено или не принадлежит вам' },
          { status: 403 }
        );
      }
    }

    // Создаем дневник
    const { data: diary, error: createError } = await serviceClient
      .from('travel_diaries')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content?.trim() || null,
        tour_id: tour_id || null,
        booking_id: booking_id || null,
        travel_date: travel_date || null,
        media_items: media_items.length > 0 ? media_items : [],
        location_data: location_data || null,
        visibility,
        auto_generated,
        user_consent: true, // Пользователь создал дневник = дал согласие
        status: 'draft', // По умолчанию черновик
      })
      .select(`
        *,
        user:profiles(id, username, avatar_url),
        tour:tours(id, title, slug, cover_image)
      `)
      .single();

    if (createError) {
      console.error('[Diaries API] Error creating diary:', createError);
      return NextResponse.json(
        { error: 'Не удалось создать дневник', details: createError.message },
        { status: 500 }
      );
    }

    // Добавляем активность в ленту
    const { error: activityError } = await serviceClient
      .from('activity_feed')
      .insert({
        user_id: user.id,
        activity_type: 'diary_created',
        target_type: 'diary',
        target_id: diary.id,
        metadata: { title: diary.title },
      });
    if (activityError) {
      console.error('[Diaries API] Error adding activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      diary,
    });
  } catch (error: any) {
    console.error('[Diaries API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

