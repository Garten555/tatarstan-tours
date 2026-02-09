'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface BlogLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialLikesCount: number;
}

export default function BlogLikeButton({ 
  postId, 
  initialLiked, 
  initialLikesCount 
}: BlogLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/blog/posts/${postId}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1));
      } else {
        toast.error(data.error || 'Не удалось поставить лайк');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Ошибка при постановке лайка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
        liked
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
      <span>{likesCount}</span>
    </button>
  );
}











