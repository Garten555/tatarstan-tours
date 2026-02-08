'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

interface BlogPostCardProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    cover_image_url?: string | null;
    reading_time?: number;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
    created_at: string;
    published_at?: string | null;
    location_tags?: string[];
    user?: {
      id: string;
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      avatar_url?: string | null;
    };
    category?: {
      id: string;
      name: string;
      slug: string;
      color?: string;
    } | null;
  };
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  const authorName = post.user
    ? (post.user.first_name && post.user.last_name
        ? `${post.user.first_name} ${post.user.last_name}`
        : post.user.username || 'Автор')
    : 'Автор';

  const displayDate = post.published_at || post.created_at;

  const authorUsername = post.user?.username || post.user?.id;
  
  return (
    <Link href={`/users/${authorUsername}/blog/${post.slug}`}>
      <article className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
        {/* Обложка */}
        {post.cover_image_url ? (
          <div className="relative h-64 overflow-hidden">
            <Image
              src={post.cover_image_url}
              alt={escapeHtml(post.title)}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {post.category && (
              <div className="absolute top-4 left-4">
                <span
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold"
                  style={{ color: post.category.color || '#10b981' }}
                >
                  {escapeHtml(post.category.name)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-64 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            {post.category && (
              <div className="absolute top-4 left-4">
                <span
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold"
                  style={{ color: post.category.color || '#10b981' }}
                >
                  {escapeHtml(post.category.name)}
                </span>
              </div>
            )}
            <div className="text-white text-4xl font-bold">
              {escapeHtml(post.title[0] || 'Б')}
            </div>
          </div>
        )}

        {/* Контент */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Заголовок */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {escapeHtml(post.title)}
          </h2>

          {/* Краткое описание */}
          {post.excerpt && (
            <p className="text-gray-600 mb-4 line-clamp-3">
              {escapeHtml(post.excerpt)}
            </p>
          )}

          {/* Метаданные */}
          <div className="mt-auto space-y-3">
            {/* Автор и дата */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {post.user?.avatar_url ? (
                <Image
                  src={post.user.avatar_url}
                  alt={authorName}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                  {authorName[0]?.toUpperCase() || 'А'}
                </div>
              )}
              <span className="font-medium">{authorName}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(displayDate), 'dd MMM yyyy', { locale: ru })}</span>
              </div>
            </div>

            {/* Локации */}
            {post.location_tags && post.location_tags.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">
                  {post.location_tags.slice(0, 2).join(', ')}
                </span>
              </div>
            )}

            {/* Статистика */}
            <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100">
              {post.reading_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{post.reading_time} мин</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.views_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.likes_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

