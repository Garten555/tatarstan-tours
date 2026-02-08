'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

type ReviewReactionsProps = {
  reviewId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: 'like' | 'dislike' | null;
};

export default function ReviewReactions({
  reviewId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
}: ReviewReactionsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(
    initialUserReaction
  );
  const [loading, setLoading] = useState(false);

  const applyReaction = (reaction: 'like' | 'dislike', nextReaction: 'like' | 'dislike' | null) => {
    if (userReaction === reaction && nextReaction === null) {
      if (reaction === 'like') setLikeCount((prev) => Math.max(prev - 1, 0));
      if (reaction === 'dislike') setDislikeCount((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (userReaction && userReaction !== reaction) {
      if (userReaction === 'like') setLikeCount((prev) => Math.max(prev - 1, 0));
      if (userReaction === 'dislike') setDislikeCount((prev) => Math.max(prev - 1, 0));
    }

    if (nextReaction === 'like') setLikeCount((prev) => prev + 1);
    if (nextReaction === 'dislike') setDislikeCount((prev) => prev + 1);
  };

  const handleClick = async (reaction: 'like' | 'dislike') => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });

      const data = await response.json();
      if (response.status === 401) {
        alert('Нужна авторизация, чтобы оставить реакцию.');
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить реакцию');
      }

      const nextReaction = data.reaction as 'like' | 'dislike' | null;
      applyReaction(reaction, nextReaction);
      setUserReaction(nextReaction);
    } catch (error) {
      console.error('Ошибка реакции:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <button
        type="button"
        onClick={() => handleClick('like')}
        disabled={loading}
        className={`inline-flex items-center gap-1 ${
          userReaction === 'like' ? 'text-emerald-600' : 'hover:text-emerald-600'
        }`}
      >
        <ThumbsUp className="w-4 h-4" />
        {likeCount}
      </button>
      <button
        type="button"
        onClick={() => handleClick('dislike')}
        disabled={loading}
        className={`inline-flex items-center gap-1 ${
          userReaction === 'dislike' ? 'text-rose-600' : 'hover:text-rose-600'
        }`}
      >
        <ThumbsDown className="w-4 h-4" />
        {dislikeCount}
      </button>
    </div>
  );
}















