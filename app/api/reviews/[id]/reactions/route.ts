import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: reactions, error } = await serviceClient
      .from('review_reactions')
      .select('reaction, user_id')
      .eq('review_id', id);

    if (error) {
      return NextResponse.json({ error: 'Не удалось загрузить реакции' }, { status: 500 });
    }

    const likeCount = reactions?.filter((r) => r.reaction === 'like').length || 0;
    const dislikeCount = reactions?.filter((r) => r.reaction === 'dislike').length || 0;
    const userReaction = user
      ? reactions?.find((r) => r.user_id === user.id)?.reaction || null
      : null;

    return NextResponse.json({
      likeCount,
      dislikeCount,
      userReaction,
    });
  } catch (error) {
    console.error('Ошибка API реакций отзывов:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

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
    const reaction = body?.reaction as 'like' | 'dislike' | null;

    if (!reaction || !['like', 'dislike'].includes(reaction)) {
      return NextResponse.json({ error: 'Некорректная реакция' }, { status: 400 });
    }

    const { data: existing } = await serviceClient
      .from('review_reactions')
      .select('id, reaction')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.id) {
      if (existing.reaction === reaction) {
        await serviceClient.from('review_reactions').delete().eq('id', existing.id);
        return NextResponse.json({ success: true, reaction: null });
      }

      const { error: updateError } = await serviceClient
        .from('review_reactions')
        .update({ reaction })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: 'Не удалось обновить реакцию' }, { status: 500 });
      }

      return NextResponse.json({ success: true, reaction });
    }

    const { error: insertError } = await serviceClient.from('review_reactions').insert({
      review_id: id,
      user_id: user.id,
      reaction,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Не удалось сохранить реакцию' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error('Ошибка API реакций отзывов:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}















