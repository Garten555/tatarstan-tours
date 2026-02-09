// API для удаления комментариев к постам
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// DELETE /api/blog/posts/[id]/comments/[commentId] - Удалить комментарий
export async function DELETE(
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

    // Проверяем права: владелец комментария или владелец поста
    const { data: comment } = await serviceClient
      .from('blog_comments')
      .select('user_id, post_id, post:travel_blog_posts!blog_comments_post_id_fkey(user_id)')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      );
    }

    const post = Array.isArray(comment.post) ? comment.post[0] : comment.post;
    const isCommentOwner = comment.user_id === user.id;
    const isPostOwner = post?.user_id === user.id;

    if (!isCommentOwner && !isPostOwner) {
      return NextResponse.json(
        { error: 'Нет доступа к удалению этого комментария' },
        { status: 403 }
      );
    }

    const { error } = await serviceClient
      .from('blog_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json(
        { error: 'Не удалось удалить комментарий' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Комментарий успешно удален',
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}











