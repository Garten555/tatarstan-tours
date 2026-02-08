'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface LikeButtonProps {
  diaryId: string;
  isLiked: boolean;
}

export function LikeButton({ diaryId, isLiked: initialIsLiked }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/diaries/${diaryId}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка лайка');
      }

      setIsLiked(data.liked);
      // Обновляем страницу для обновления счетчика
      window.location.reload();
    } catch (error: any) {
      console.error('Ошибка лайка:', error);
      toast.error(error.message || 'Не удалось поставить лайк');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
        isLiked
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } disabled:opacity-50`}
    >
      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
      <span>{isLiked ? 'Лайкнуто' : 'Лайкнуть'}</span>
    </button>
  );
}



















