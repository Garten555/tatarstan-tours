'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import BlogPostCard from './BlogPostCard';
import toast from 'react-hot-toast';

interface BlogFeedProps {
  userId?: string;
  categoryId?: string;
  tagId?: string;
  featured?: boolean;
}

export default function BlogFeed({ userId, categoryId, tagId, featured }: BlogFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadPosts = async (reset = false) => {
    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;
      
      const params = new URLSearchParams();
      if (userId) params.set('user_id', userId);
      if (categoryId) params.set('category_id', categoryId);
      if (tagId) params.set('tag_id', tagId);
      if (featured) params.set('featured', 'true');
      params.set('limit', '12');
      params.set('offset', currentOffset.toString());

      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setPosts(data.posts || []);
        } else {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        }
        setHasMore(data.pagination?.hasMore || false);
        setOffset(currentOffset + (data.posts?.length || 0));
      } else {
        throw new Error(data.error || 'Не удалось загрузить посты');
      }
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error(error.message || 'Ошибка загрузки постов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, categoryId, tagId, featured]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-xl font-semibold">Пока нет постов</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={() => loadPosts(false)}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка...
              </span>
            ) : (
              'Загрузить еще'
            )}
          </button>
        </div>
      )}
    </div>
  );
}





