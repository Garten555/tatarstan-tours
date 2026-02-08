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

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Введите текст комментария' }, { status: 400 });
    }

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, is_banned, ban_until, ban_reason')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'tour_admin' ||
      profile?.role === 'support_admin';

    if (!isAdmin && profile?.is_banned) {
      if (profile.ban_until) {
        const until = new Date(profile.ban_until);
        if (until.getTime() <= Date.now()) {
          await serviceClient
            .from('profiles')
            .update({ is_banned: false, ban_until: null, ban_reason: null, banned_at: null })
            .eq('id', user.id);
        } else {
          return NextResponse.json(
            { error: profile.ban_reason || 'Вы заблокированы', ban_until: profile.ban_until },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: profile.ban_reason || 'Вы заблокированы' },
          { status: 403 }
        );
      }
    }

    const { data: comment, error } = await serviceClient
      .from('review_comments')
      .insert({
        review_id: id,
        user_id: user.id,
        message,
      })
      .select()
      .single();

    if (error || !comment) {
      return NextResponse.json({ error: 'Не удалось сохранить комментарий' }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Ошибка API комментариев:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

