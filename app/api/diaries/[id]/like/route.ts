// API для лайков дневников
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/diaries/[id]/like - Поставить/убрать лайк
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { id: diaryId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем доступ к дневнику
    const { data: diary } = await serviceClient
      .from('travel_diaries')
      .select('id, status, visibility, user_id')
      .eq('id', diaryId)
      .single();

    if (!diary) {
      return NextResponse.json(
        { error: 'Дневник не найден' },
        { status: 404 }
      );
    }

    // Проверяем доступ (публичный или свой)
    const isOwner = diary.user_id === user.id;
    const isPublic = diary.status === 'published' && diary.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этому дневнику' },
        { status: 403 }
      );
    }

    // Проверяем, есть ли уже лайк
    const { data: existingLike } = await serviceClient
      .from('diary_likes')
      .select('id')
      .eq('diary_id', diaryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Убираем лайк
      const { error: deleteError } = await serviceClient
        .from('diary_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('[Diary Like API] Error removing like:', deleteError);
        return NextResponse.json(
          { error: 'Не удалось убрать лайк' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Лайк убран',
      });
    } else {
      // Ставим лайк
      const { error: insertError } = await serviceClient
        .from('diary_likes')
        .insert({
          diary_id: diaryId,
          user_id: user.id,
        });

      if (insertError) {
        console.error('[Diary Like API] Error adding like:', insertError);
        return NextResponse.json(
          { error: 'Не удалось поставить лайк' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: true,
        message: 'Лайк поставлен',
      });
    }
  } catch (error: any) {
    console.error('[Diary Like API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// GET /api/diaries/[id]/like - Проверить, лайкнул ли пользователь
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { id: diaryId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        liked: false,
      });
    }

    const { data: like } = await serviceClient
      .from('diary_likes')
      .select('id')
      .eq('diary_id', diaryId)
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      liked: !!like,
    });
  } catch (error: any) {
    console.error('[Diary Like API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}




















