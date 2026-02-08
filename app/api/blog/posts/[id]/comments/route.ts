// API для комментариев к постам
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/blog/posts/[id]/comments - Получить комментарии к посту
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceClient = createServiceClient();

    const { data: comments, error } = await serviceClient
      .from('blog_comments')
      .select(`
        *,
        user:profiles!blog_comments_user_id_fkey(id, username, first_name, last_name, avatar_url)
      `)
      .eq('post_id', id)
      .is('parent_id', null) // Только корневые комментарии
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить комментарии' },
        { status: 500 }
      );
    }

    // Загружаем ответы для каждого комментария
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await serviceClient
          .from('blog_comments')
          .select(`
            *,
            user:profiles!blog_comments_user_id_fkey(id, username, first_name, last_name, avatar_url)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/blog/posts/[id]/comments - Создать комментарий
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

    const body = await request.json();
    const { content, parent_id } = body;

    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      );
    }

    const { data: comment, error } = await serviceClient
      .from('blog_comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(`
        *,
        user:profiles!blog_comments_user_id_fkey(id, username, first_name, last_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Не удалось создать комментарий' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

