'use client';

import { useState } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
  userId: string;
}

export function FollowButton({ username, isFollowing: initialIsFollowing, userId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    try {
      setLoading(true);
      // Кодируем username для URL (на случай спецсимволов)
      const encodedUsername = encodeURIComponent(username);
      const response = await fetch(`/api/users/${encodedUsername}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Проверяем content-type перед парсингом JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Ошибка подписки');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка подписки');
      }

      setIsFollowing(data.following);
      toast.success(data.following ? 'Вы подписались' : 'Вы отписались');
    } catch (error: any) {
      console.error('Ошибка подписки:', error);
      const errorMessage = error.message || 'Не удалось изменить подписку';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-5 h-5" />
          <span>Отписаться</span>
        </>
      ) : (
        <>
          <UserPlus className="w-5 h-5" />
          <span>Подписаться</span>
        </>
      )}
    </button>
  );
}



















