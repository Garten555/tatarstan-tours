// API для работы с конкретным дневником
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { UpdateDiaryRequest } from '@/types';

// GET /api/diaries/[id] - Получить дневник по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Получаем дневник
    const { data: diary, error } = await serviceClient
      .from('travel_diaries')
      .select(`
        *,
        user:profiles(id, username, avatar_url, public_profile_enabled),
        tour:tours(id, title, slug, cover_image, category)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Diary API] Error fetching diary:', error);
      return NextResponse.json(
        { error: 'Не удалось получить дневник' },
        { status: 500 }
      );
    }

    if (!diary) {
      return NextResponse.json(
        { error: 'Дневник не найден' },
        { status: 404 }
      );
    }

    // Проверка доступа
    const isOwner = user?.id === diary.user_id;
    const isPublic = diary.status === 'published' && diary.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этому дневнику' },
        { status: 403 }
      );
    }

    // Увеличиваем счетчик просмотров (только для опубликованных)
    if (!isOwner && diary.status === 'published') {
      const { error: updateError } = await serviceClient
        .from('travel_diaries')
        .update({ views_count: (diary.views_count || 0) + 1 })
        .eq('id', id);

      if (updateError) {
        console.error('[Diary API] Error updating views:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      diary,
    });
  } catch (error: any) {
    console.error('[Diary API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/diaries/[id] - Обновить дневник
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, что дневник принадлежит пользователю
    const { data: existingDiary } = await serviceClient
      .from('travel_diaries')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!existingDiary) {
      return NextResponse.json(
        { error: 'Дневник не найден' },
        { status: 404 }
      );
    }

    if (existingDiary.user_id !== user.id) {
      return NextResponse.json(
        { error: 'У вас нет прав на редактирование этого дневника' },
        { status: 403 }
      );
    }

    const body: UpdateDiaryRequest = await request.json();
    const updateData: any = {};

    if (body.title !== undefined) {
      if (body.title.trim().length < 3) {
        return NextResponse.json(
          { error: 'Название дневника должно содержать минимум 3 символа' },
          { status: 400 }
        );
      }
      updateData.title = body.title.trim();
    }

    if (body.content !== undefined) {
      updateData.content = body.content?.trim() || null;
    }

    if (body.cover_image_url !== undefined) {
      updateData.cover_image_url = body.cover_image_url || null;
    }

    if (body.media_items !== undefined) {
      updateData.media_items = body.media_items;
    }

    if (body.location_data !== undefined) {
      updateData.location_data = body.location_data;
    }

    if (body.travel_date !== undefined) {
      updateData.travel_date = body.travel_date || null;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Если публикуем впервые - устанавливаем published_at
      if (body.status === 'published' && existingDiary.status !== 'published') {
        updateData.published_at = new Date().toISOString();

        // Добавляем активность в ленту
        const updatePayload = updateData as any;
        const existing = existingDiary as any;
        const { error: activityError } = await serviceClient
          .from('activity_feed')
          .insert({
            user_id: user.id,
            activity_type: 'diary_published',
            target_type: 'diary',
            target_id: id,
            metadata: { title: updatePayload.title || existing.title },
          });
        if (activityError) {
          console.error('[Diary API] Error adding activity:', activityError);
        }
      }
    }

    if (body.visibility !== undefined) {
      updateData.visibility = body.visibility;
    }

    // Обновляем дневник
    const { data: updatedDiary, error: updateError } = await serviceClient
      .from('travel_diaries')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:profiles(id, username, avatar_url),
        tour:tours(id, title, slug, cover_image)
      `)
      .single();

    if (updateError) {
      console.error('[Diary API] Error updating diary:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить дневник', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      diary: updatedDiary,
    });
  } catch (error: any) {
    console.error('[Diary API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE /api/diaries/[id] - Удалить дневник
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, что дневник принадлежит пользователю
    const { data: diary } = await serviceClient
      .from('travel_diaries')
      .select('user_id, cover_image_path, media_items')
      .eq('id', id)
      .single();

    if (!diary) {
      return NextResponse.json(
        { error: 'Дневник не найден' },
        { status: 404 }
      );
    }

    if (diary.user_id !== user.id) {
      return NextResponse.json(
        { error: 'У вас нет прав на удаление этого дневника' },
        { status: 403 }
      );
    }

    // TODO: Удаление медиа из S3 (cover_image_path и media_items)

    // Удаляем дневник
    const { error: deleteError } = await serviceClient
      .from('travel_diaries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Diary API] Error deleting diary:', deleteError);
      return NextResponse.json(
        { error: 'Не удалось удалить дневник' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Дневник удален',
    });
  } catch (error: any) {
    console.error('[Diary API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

