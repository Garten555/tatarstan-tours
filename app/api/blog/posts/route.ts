// API для постов блога
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/blog/posts - Получить список постов
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);

    const { data: { user } } = await supabase.auth.getUser();

    // Параметры запроса
    const userId = searchParams.get('user_id'); // Фильтр по автору
    const categoryId = searchParams.get('category_id'); // Фильтр по категории
    const tagId = searchParams.get('tag_id'); // Фильтр по тегу
    const status = searchParams.get('status'); // draft, published, archived
    const visibility = searchParams.get('visibility'); // public, friends, private
    const featured = searchParams.get('featured') === 'true'; // Только избранные
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = serviceClient
      .from('travel_blog_posts')
      .select(`
        *,
        user:profiles!travel_blog_posts_user_id_fkey(id, username, first_name, last_name, avatar_url, public_profile_enabled),
        category:blog_categories(id, name, slug, icon, color),
        tour:tours(id, title, slug, cover_image)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Фильтры
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (tagId) {
      query = query.contains('tag_ids', [tagId]);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // По умолчанию показываем только опубликованные
      if (!userId || userId !== user?.id) {
        query = query.eq('status', 'published');
      }
    }

    if (visibility) {
      query = query.eq('visibility', visibility);
    } else {
      // По умолчанию показываем только публичные
      if (!userId || userId !== user?.id) {
        query = query.eq('visibility', 'public');
      }
    }

    if (featured) {
      query = query.eq('featured', true);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching blog posts:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить посты' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      posts: posts || [],
      pagination: {
        limit,
        offset,
        hasMore: (posts || []).length === limit,
      },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/blog/posts - Создать новый пост
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Проверяем наличие SERVICE_ROLE_KEY
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json(
        { error: 'Ошибка конфигурации сервера: SERVICE_ROLE_KEY не установлен' },
        { status: 500 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем существование таблицы (попытка простого запроса)
    const { error: tableCheckError } = await serviceClient
      .from('travel_blog_posts')
      .select('id')
      .limit(0);
    
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.error('Table travel_blog_posts does not exist:', tableCheckError);
      return NextResponse.json(
        { 
          error: 'Таблица travel_blog_posts не найдена в базе данных',
          details: 'Пожалуйста, убедитесь, что миграция 034_blog_system.sql применена',
          code: tableCheckError.code
        },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Неверный формат данных запроса', details: parseError.message },
        { status: 400 }
      );
    }

    const {
      title,
      slug,
      excerpt,
      content,
      cover_image_url,
      cover_image_path,
      status = 'draft',
      visibility = 'public',
      featured = false,
      pinned = false,
      tour_id,
      category_id,
      tag_ids = [],
      location_tags = [],
    } = body;

    // Валидация
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Заголовок поста не может быть пустым' },
        { status: 400 }
      );
    }

    // Функция транслитерации для генерации slug
    const transliterate = (text: string): string => {
      const map: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      
      return text
        .toLowerCase()
        .split('')
        .map(char => {
          const lower = char.toLowerCase();
          if (map[lower]) return map[lower];
          if (char >= 'a' && char <= 'z') return char;
          if (char >= '0' && char <= '9') return char;
          return '-';
        })
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
    };

    // Генерируем slug автоматически, если он не передан или слишком короткий
    let finalSlug = slug?.trim() || '';
    if (!finalSlug || finalSlug.length < 3) {
      finalSlug = transliterate(title);
      // Если после транслитерации slug все еще слишком короткий, добавляем префикс
      if (finalSlug.length < 3) {
        finalSlug = `post-${Date.now().toString(36)}`;
      }
    }

    // Проверка уникальности slug для пользователя и генерация уникального, если нужно
    let uniqueSlug = finalSlug;
    let counter = 0;
    while (true) {
      const { data: existingPost } = await serviceClient
        .from('travel_blog_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('slug', uniqueSlug)
        .maybeSingle();

      if (!existingPost) {
        break; // Slug уникален
      }
      
      // Генерируем новый slug с суффиксом
      counter++;
      uniqueSlug = `${finalSlug}-${counter}`;
      
      // Защита от бесконечного цикла
      if (counter > 1000) {
        uniqueSlug = `${finalSlug}-${Date.now()}`;
        break;
      }
    }
    
    finalSlug = uniqueSlug;

    // Расчет времени чтения (примерно 200 слов в минуту)
    const wordCount = content ? content.split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Создаем пост
    const insertData = {
      user_id: user.id,
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt?.trim() || null,
      content: content?.trim() || null,
      cover_image_url: cover_image_url || null,
      cover_image_path: cover_image_path || null,
      status,
      visibility,
      featured,
      pinned,
      tour_id: tour_id || null,
      category_id: category_id || null,
      tag_ids: tag_ids || [],
      location_tags: location_tags || [],
      reading_time: readingTime,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };

    console.log('Attempting to insert blog post:', {
      userId: user.id,
      title: insertData.title,
      slug: insertData.slug,
      status: insertData.status,
      publishedAt: insertData.published_at,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    const { data: post, error: createError } = await serviceClient
      .from('travel_blog_posts')
      .insert(insertData)
      .select(`
        *,
        user:profiles!travel_blog_posts_user_id_fkey(id, username, first_name, last_name, avatar_url),
        category:blog_categories(id, name, slug, icon, color),
        tour:tours(id, title, slug, cover_image)
      `)
      .single();

    if (createError) {
      console.error('Error creating blog post:', {
        error: createError,
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
        body: insertData,
        serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      
      // Более детальное сообщение об ошибке
      let errorMessage = 'Не удалось создать пост';
      if (createError.code === '42P01') {
        errorMessage = 'Таблица travel_blog_posts не найдена. Проверьте миграции базы данных.';
      } else if (createError.code === '23505') {
        errorMessage = 'Пост с таким slug уже существует';
      } else if (createError.code === '42501') {
        errorMessage = 'Ошибка прав доступа. Проверьте RLS политики.';
      } else if (createError.message) {
        errorMessage = createError.message;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: createError.details || createError.message || 'Неизвестная ошибка базы данных',
          code: createError.code,
          hint: createError.hint
        },
        { status: 500 }
      );
    }

    // Если есть теги, создаем связи
    if (tag_ids && tag_ids.length > 0) {
      const tagLinks = tag_ids.map((tagId: string) => ({
        post_id: post.id,
        tag_id: tagId,
      }));

      await serviceClient
        .from('blog_post_tags')
        .insert(tagLinks);
    }

    console.log('Blog post created successfully:', {
      postId: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      publishedAt: post.published_at,
      userId: post.user_id
    });

    // Если пост опубликован, отправляем уведомления подписчикам
    if (status === 'published') {
      try {
        // Получаем всех подписчиков автора поста
        const { data: followers } = await serviceClient
          .from('user_follows')
          .select('follower_id')
          .eq('followed_id', user.id);

        if (followers && followers.length > 0) {
          const authorName = post.user?.first_name && post.user?.last_name
            ? `${post.user.first_name} ${post.user.last_name}`
            : post.user?.username || 'Пользователь';

          // Создаем уведомления для всех подписчиков
          const notifications = followers.map((follower: any) => ({
            user_id: follower.follower_id,
            title: 'Новый пост',
            body: `${authorName} опубликовал(а) новый пост: "${post.title}"`,
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
      post,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

