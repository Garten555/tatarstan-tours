// API для отдельного поста блога
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// GET /api/blog/posts/[id] - Получить пост по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: post, error } = await serviceClient
      .from('travel_blog_posts')
      .select(`
        *,
        user:profiles!travel_blog_posts_user_id_fkey(id, username, first_name, last_name, avatar_url, public_profile_enabled),
        category:blog_categories(id, name, slug, icon, color),
        tour:tours(id, title, slug, cover_image)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Пост не найден' },
        { status: 404 }
      );
    }

    // Проверка доступа
    const isOwner = user?.id === post.user_id;
    const isPublic = post.status === 'published' && post.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'Доступ ограничен' },
        { status: 403 }
      );
    }

    // Увеличиваем счетчик просмотров (только для опубликованных и не владельца)
    if (!isOwner && post.status === 'published') {
      await serviceClient
        .from('travel_blog_posts')
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq('id', id);
    }

    // Проверяем лайк
    let isLiked = false;
    if (user) {
      const { data: like } = await serviceClient
        .from('blog_likes')
        .select('post_id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      isLiked = !!like;
    }

    // Проверяем закладку
    let isBookmarked = false;
    if (user) {
      const { data: bookmark } = await serviceClient
        .from('blog_bookmarks')
        .select('post_id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      isBookmarked = !!bookmark;
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        isLiked,
        isBookmarked,
      },
      isLiked,
      isBookmarked,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/blog/posts/[id] - Обновить пост
export async function PATCH(
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

    // Проверяем права
    const { data: post } = await serviceClient
      .from('travel_blog_posts')
      .select('user_id, published_at')
      .eq('id', id)
      .single();

    if (!post || post.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к редактированию этого поста' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.slug !== undefined) updates.slug = body.slug.trim();
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt?.trim() || null;
    if (body.content !== undefined) {
      updates.content = body.content?.trim() || null;
      // Пересчитываем время чтения
      const wordCount = body.content ? body.content.split(/\s+/).length : 0;
      updates.reading_time = Math.max(1, Math.ceil(wordCount / 200));
    }
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
    if (body.cover_image_path !== undefined) updates.cover_image_path = body.cover_image_path;
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'published' && !(post as any).published_at) {
        updates.published_at = new Date().toISOString();
      }
    }
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.featured !== undefined) updates.featured = body.featured;
    if (body.pinned !== undefined) updates.pinned = body.pinned;
    if (body.tour_id !== undefined) updates.tour_id = body.tour_id || null;
    if (body.category_id !== undefined) updates.category_id = body.category_id || null;
    if (body.tag_ids !== undefined) updates.tag_ids = body.tag_ids || [];
    if (body.location_tags !== undefined) updates.location_tags = body.location_tags || [];

    const { data: updatedPost, error } = await serviceClient
      .from('travel_blog_posts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:profiles!travel_blog_posts_user_id_fkey(id, username, first_name, last_name, avatar_url),
        category:blog_categories(id, name, slug, icon, color),
        tour:tours(id, title, slug, cover_image)
      `)
      .single();

    if (error) {
      console.error('Error updating blog post:', error);
      return NextResponse.json(
        { error: 'Не удалось обновить пост' },
        { status: 500 }
      );
    }

    // Обновляем связи с тегами, если они изменились
    if (body.tag_ids !== undefined) {
      // Удаляем старые связи
      await serviceClient
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id);

      // Создаем новые связи
      if (body.tag_ids && body.tag_ids.length > 0) {
        const tagLinks = body.tag_ids.map((tagId: string) => ({
          post_id: id,
          tag_id: tagId,
        }));

        await serviceClient
          .from('blog_post_tags')
          .insert(tagLinks);
      }
    }

    // Если пост только что опубликован (был черновиком, стал опубликованным), отправляем уведомления
    if (body.status === 'published' && !(post as any).published_at && updatedPost) {
      try {
        // Получаем всех подписчиков автора поста
        const { data: followers } = await serviceClient
          .from('user_follows')
          .select('follower_id')
          .eq('followed_id', user.id);

        if (followers && followers.length > 0) {
          const authorName = updatedPost.user?.first_name && updatedPost.user?.last_name
            ? `${updatedPost.user.first_name} ${updatedPost.user.last_name}`
            : updatedPost.user?.username || 'Пользователь';

          // Создаем уведомления для всех подписчиков
          const notifications = followers.map((follower: any) => ({
            user_id: follower.follower_id,
            title: 'Новый пост',
            body: `${authorName} опубликовал(а) новый пост: "${updatedPost.title}"`,
            type: 'blog_post',
          }));

          const { error: notificationsError } = await serviceClient
            .from('notifications')
            .insert(notifications);
          
          if (notificationsError) {
            console.error('Ошибка создания уведомлений о новом посте:', notificationsError);
          }
        }
      } catch (error) {
        console.error('Ошибка отправки уведомлений о новом посте:', error);
        // Не прерываем выполнение, если уведомления не удалось отправить
      }
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE /api/blog/posts/[id] - Удалить пост
export async function DELETE(
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

    // Проверяем права
    const { data: post } = await serviceClient
      .from('travel_blog_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!post || post.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к удалению этого поста' },
        { status: 403 }
      );
    }

    const { error } = await serviceClient
      .from('travel_blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting blog post:', error);
      return NextResponse.json(
        { error: 'Не удалось удалить пост' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Пост успешно удален',
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

