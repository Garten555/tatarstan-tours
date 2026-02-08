import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    const { data: comment, error } = await serviceClient
      .from('review_comments')
      .update({
        is_reported: true,
        reported_at: new Date().toISOString(),
        reported_by: user.id,
        report_reason: reason,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !comment) {
      return NextResponse.json({ error: 'Не удалось отправить жалобу' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка API жалобы на комментарий:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}















