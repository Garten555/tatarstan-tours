// API для жалоб на комментарии к постам
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/blog/posts/[id]/comments/[commentId]/report - Пожаловаться на комментарий
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    // Проверяем, есть ли поля для жалоб в таблице blog_comments
    // Если нет, создадим миграцию позже, пока просто обновим
    const { data: comment, error } = await serviceClient
      .from('blog_comments')
      .update({
        is_reported: true,
        reported_at: new Date().toISOString(),
        reported_by: user.id,
        report_reason: reason,
      })
      .eq('id', commentId)
      .select('id')
      .single();

    if (error || !comment) {
      // Если поля не существуют, вернем ошибку, но не критичную
      console.error('Error reporting comment:', error);
      // Попробуем без обновления полей (они могут не существовать)
      return NextResponse.json(
        { error: 'Не удалось отправить жалобу. Возможно, функция еще не реализована.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}











