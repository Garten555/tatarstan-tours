// API для лайков постов
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/blog/posts/[id]/like - Поставить/убрать лайк
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, есть ли уже лайк
    const { data: existingLike } = await serviceClient
      .from('blog_likes')
      .select('post_id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Убираем лайк
      const { error } = await serviceClient
        .from('blog_likes')
        .delete()
        .eq('post_id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing like:', error);
        return NextResponse.json(
          { error: 'Не удалось убрать лайк' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: false,
      });
    } else {
      // Ставим лайк
      const { error } = await serviceClient
        .from('blog_likes')
        .insert({
          post_id: id,
          user_id: user.id,
        });

      if (error) {
        console.error('Error adding like:', error);
        return NextResponse.json(
          { error: 'Не удалось поставить лайк' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: true,
      });
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}












