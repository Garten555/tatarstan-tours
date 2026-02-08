import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['super_admin', 'support_admin', 'tour_admin'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const reviewId = id;
    if (!reviewId) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'approve';
    const reportReason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    let updateData: Record<string, any> = {};
    if (action === 'approve') {
      updateData = {
        is_approved: true,
        is_published: true,
        is_reported: false,
        reported_at: null,
        reported_by: null,
        report_reason: null,
      };
    } else if (action === 'unpublish') {
      updateData = {
        is_published: false,
      };
    } else if (action === 'report') {
      updateData = {
        is_reported: true,
        reported_at: new Date().toISOString(),
        reported_by: user.id,
        report_reason: reportReason,
        is_published: false,
      };
    } else {
      return NextResponse.json({ error: 'Недопустимое действие' }, { status: 400 });
    }

    const { data: review, error } = await (serviceClient as any)
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (error || !review) {
      return NextResponse.json({ error: 'Не удалось обновить отзыв' }, { status: 500 });
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Ошибка модерации отзыва:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

