import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Calendar, 
  Eye, 
  Heart, 
  MessageCircle, 
  Clock,
  MapPin,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import BlogLikeButton from '@/components/blog/BlogLikeButton';
import BlogComments from '@/components/blog/BlogComments';

interface BlogPostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { username, slug } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Находим пользователя по username или id
  const { data: author } = await serviceClient
    .from('profiles')
    .select('id')
    .or(`username.eq.${username},id.eq.${username}`)
    .maybeSingle();

  if (!author) {
    notFound();
  }

  // Получаем пост
  const { data: post, error } = await serviceClient
    .from('travel_blog_posts')
    .select(`
      *,
      user:profiles(id, username, first_name, last_name, avatar_url, public_profile_enabled),
      category:blog_categories(id, name, slug, icon, color),
      tour:tours(id, title, slug, cover_image)
    `)
    .eq('user_id', author.id)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  // Проверка доступа
  const isOwner = user?.id === post.user_id;
  const isPublic = post.status === 'published' && post.visibility === 'public';

  if (!isOwner && !isPublic) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Доступ ограничен</h2>
          <p className="text-gray-600 mb-6">Этот пост недоступен для просмотра.</p>
          <Link
            href={`/users/${username}`}
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Вернуться к туристическому паспорту
          </Link>
        </div>
      </div>
    );
  }

  // Проверяем лайк и закладку
  let isLiked = false;
  let isBookmarked = false;
  
  if (user) {
    const [likeResult, bookmarkResult] = await Promise.all([
      serviceClient
        .from('blog_likes')
        .select('post_id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      serviceClient
        .from('blog_bookmarks')
        .select('post_id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);
    
    isLiked = !!likeResult.data;
    isBookmarked = !!bookmarkResult.data;
  }

  // Увеличиваем счетчик просмотров (только для опубликованных и не владельца)
  if (!isOwner && post.status === 'published') {
    await serviceClient
      .from('travel_blog_posts')
      .update({ views_count: (post.views_count || 0) + 1 })
      .eq('id', post.id);
  }

  const authorName = post.user
    ? (post.user.first_name && post.user.last_name
        ? `${post.user.first_name} ${post.user.last_name}`
        : post.user.username || 'Автор')
    : 'Автор';

  const displayDate = post.published_at || post.created_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Кнопка назад */}
        <Link
          href={`/users/${username}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">К туристическому паспорту</span>
        </Link>

        {/* Пост */}
        <article className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Обложка */}
          {post.cover_image_url && (
            <div className="relative h-96 overflow-hidden">
              <Image
                src={post.cover_image_url}
                alt={escapeHtml(post.title)}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {post.category && (
                <div className="absolute top-6 left-6">
                  <span
                    className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold"
                    style={{ color: post.category.color || '#10b981' }}
                  >
                    {escapeHtml(post.category.name)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Контент */}
          <div className="p-8 md:p-10">
            {/* Заголовок */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
              {escapeHtml(post.title)}
            </h1>

            {/* Метаданные */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-600">
              <div className="flex items-center gap-2">
                {post.user?.avatar_url ? (
                  <Image
                    src={post.user.avatar_url}
                    alt={authorName}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    {authorName[0]?.toUpperCase() || 'А'}
                  </div>
                )}
                <span className="font-semibold">{authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{format(new Date(displayDate), 'dd MMMM yyyy', { locale: ru })}</span>
              </div>
              {post.reading_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{post.reading_time} мин чтения</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <span>{post.views_count || 0}</span>
              </div>
            </div>

            {/* Локации */}
            {post.location_tags && post.location_tags.length > 0 && (
              <div className="flex items-center gap-2 mb-6 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>{post.location_tags.join(', ')}</span>
              </div>
            )}

            {/* Содержание */}
            {post.content && (
              <div 
                className="prose prose-lg max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}

            {/* Действия */}
            <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
              {user && (
                <BlogLikeButton 
                  postId={post.id} 
                  initialLiked={isLiked}
                  initialLikesCount={post.likes_count || 0}
                />
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <MessageCircle className="w-5 h-5" />
                <span>{post.comments_count || 0} комментариев</span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
                <Share2 className="w-5 h-5" />
                Поделиться
              </button>
            </div>
          </div>
        </article>

        {/* Комментарии */}
        {user && (
          <div className="mt-8">
            <BlogComments postId={post.id} />
          </div>
        )}
      </div>
    </div>
  );
}











