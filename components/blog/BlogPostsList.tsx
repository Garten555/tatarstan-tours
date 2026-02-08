'use client';

import { useState, useEffect } from 'react';
import BlogPostFeedItem from './BlogPostFeedItem';
import BlogPostCreator from './BlogPostCreator';
import { BookOpen } from 'lucide-react';

interface BlogPostsListProps {
  initialPosts: any[];
  userId: string;
  completedTours?: any[];
  isOwner?: boolean;
  isAdminView?: boolean; // Для просмотра админом
}

export default function BlogPostsList({ 
  initialPosts, 
  userId, 
  completedTours = [],
  isOwner = false,
  isAdminView = false
}: BlogPostsListProps) {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    // Слушаем событие создания нового поста
    const handlePostCreated = (event: CustomEvent) => {
      const newPost = event.detail.post;
      if (newPost) {
        // Добавляем новый пост в начало списка
        setPosts(prev => [newPost, ...prev]);
      } else {
        // Если пост не передан, перезагружаем список
        fetch(`/api/blog/posts?user_id=${userId}&limit=20`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.posts) {
              setPosts(data.posts);
            }
          })
          .catch(console.error);
      }
    };

    // Слушаем событие удаления поста
    const handlePostDeleted = (event: CustomEvent) => {
      const postId = event.detail.postId;
      if (postId) {
        // Удаляем пост из списка
        setPosts(prev => prev.filter(post => post.id !== postId));
      }
    };

    window.addEventListener('blog:post-created', handlePostCreated as EventListener);
    window.addEventListener('blog:post-deleted', handlePostDeleted as EventListener);

    return () => {
      window.removeEventListener('blog:post-created', handlePostCreated as EventListener);
      window.removeEventListener('blog:post-deleted', handlePostDeleted as EventListener);
    };
  }, [userId]);

  return (
    <>
      {/* Форма создания поста (только для владельца) */}
      {isOwner && (
        <div className="mb-6">
          <BlogPostCreator 
            userId={userId}
            completedTours={completedTours}
          />
        </div>
      )}
      
      {posts.length > 0 ? (
        <div className="w-full space-y-6">
          {posts.map((post: any) => (
            <BlogPostFeedItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Пока нет постов в блоге</h3>
          <p className="text-lg md:text-xl text-gray-600">
            {isAdminView 
              ? 'У пользователя пока нет постов в блоге'
              : 'Создайте свой первый пост, используя кнопку выше!'
            }
          </p>
        </div>
      )}
    </>
  );
}






