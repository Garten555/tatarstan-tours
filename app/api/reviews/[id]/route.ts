import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { shouldAutoPublishReview } from '@/lib/reviews/staff-auto-publish';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reviewId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json();
    const rating = body?.rating != null ? Number(body.rating) : undefined;
    const text = typeof body?.text === 'string' ? body.text.trim() : undefined;

    if (rating == null && text === undefined) {
      return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 });
    }

    if (rating != null && (Number.isNaN(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Рейтинг должен быть от 1 до 5' }, { status: 400 });
    }

    const { data: existing, error: loadError } = await serviceClient
      .from('reviews')
      .select('id, user_id, rating, text')
      .eq('id', reviewId)
      .single();

    if (loadError || !existing) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const autoPublish = shouldAutoPublishReview(
      (authorProfile as { role?: string | null } | null)?.role
    );

    const patch: Record<string, unknown> = {
      is_approved: autoPublish,
      is_published: autoPublish,
    };
    if (rating != null) patch.rating = rating;
    if (text !== undefined) patch.text = text || null;

    const { data: review, error: updateError } = await serviceClient
      .from('reviews')
      .update(patch)
      .eq('id', reviewId)
      .select('id, rating, text, created_at')
      .single();

    if (updateError || !review) {
      console.error('review PATCH:', updateError);
      return NextResponse.json({ error: 'Не удалось обновить отзыв' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      review,
      auto_published: autoPublish,
    });
  } catch (error) {
    console.error('review PATCH error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
