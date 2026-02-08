'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';

interface BlogCommentsProps {
  postId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  replies?: Comment[];
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog/posts/${postId}/comments`);
      const data = await response.json();

      if (data.success) {
        setComments(data.comments || []);
      } else {
        throw new Error(data.error || 'Не удалось загрузить комментарии');
      }
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast.error(error.message || 'Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/blog/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment('');
        await loadComments();
        toast.success('Комментарий добавлен');
      } else {
        throw new Error(data.error || 'Не удалось добавить комментарий');
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      toast.error(error.message || 'Ошибка при добавлении комментария');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Комментарии ({comments.length})
      </h2>

      {/* Форма добавления комментария */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Написать комментарий..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Отправить
              </>
            )}
          </button>
        </div>
      </form>

      {/* Список комментариев */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Пока нет комментариев. Будьте первым!
          </p>
        ) : (
          comments.map((comment) => {
            const authorName = comment.user
              ? (comment.user.first_name && comment.user.last_name
                  ? `${comment.user.first_name} ${comment.user.last_name}`
                  : comment.user.username || 'Пользователь')
              : 'Пользователь';

            return (
              <div key={comment.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex gap-4">
                  {comment.user?.avatar_url ? (
                    <Image
                      src={comment.user.avatar_url}
                      alt={authorName}
                      width={40}
                      height={40}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {authorName[0]?.toUpperCase() || 'П'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {escapeHtml(authorName)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(comment.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {escapeHtml(comment.content)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}










