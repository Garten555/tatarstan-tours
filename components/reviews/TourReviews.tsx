'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import ImageViewerModal from '@/components/common/ImageViewerModal';
import ReviewReactions from '@/components/reviews/ReviewReactions';

type ReviewMedia = {
  media_type: 'image' | 'video';
  media_url: string;
};

type ReviewItem = {
  id: string;
  user_name: string;
  user_avatar?: string | null;
  created_at: string;
  rating: number;
  text: string | null;
  media: ReviewMedia[];
  like_count: number;
  dislike_count: number;
  user_reaction: 'like' | 'dislike' | null;
  comments: { id: string; message: string; user_name: string; user_avatar: string | null; created_at: string }[];
};

type TourReviewsProps = {
  reviews: ReviewItem[];
  reviewCount: number;
  averageRating: number;
};

export default function TourReviews({ reviews, reviewCount, averageRating }: TourReviewsProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [commentForms, setCommentForms] = useState<Record<string, boolean>>({});
  const [localComments, setLocalComments] = useState<
    Record<string, { id: string; message: string; user_name: string; user_avatar: string | null; created_at: string }[]>
  >({});

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  useEffect(() => {
    const next: Record<
      string,
      { id: string; message: string; user_name: string; user_avatar: string | null; created_at: string }[]
    > = {};
    reviews.forEach((review) => {
      next[review.id] = review.comments || [];
    });
    setLocalComments(next);
  }, [reviews]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-emerald-600';
    if (rating >= 3.5) return 'text-lime-600';
    if (rating >= 2.5) return 'text-amber-500';
    return 'text-rose-500';
  };

  const handleTextareaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = 'auto';
    const nextHeight = Math.min(target.scrollHeight, 220);
    target.style.height = `${nextHeight}px`;
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/50 border-2 border-emerald-200/50 rounded-xl mb-4">
            <span className="text-sm font-bold text-emerald-700">Отзывы</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-2">Отзывы путешественников</h2>
          <p className="text-lg font-bold text-gray-600">
            {reviewCount > 0 ? `Всего отзывов: ${reviewCount}` : 'Пока нет опубликованных отзывов'}
          </p>
        </div>
        {reviewCount > 0 && (
          <div className={`flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-xl ${getRatingColor(averageRating)}`}>
            <Star className="w-6 h-6" fill="currentColor" />
            <span className="text-2xl font-black text-gray-900">{averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {reviewCount === 0 ? (
        <div className="text-center py-12">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-black text-gray-900">Пока нет опубликованных отзывов</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => {
            const imageItems = review.media.filter((item) => item.media_type === 'image');
            const imageUrls = imageItems.map((item) => item.media_url);
            return (
              <div
                key={review.id}
                className="border-2 border-gray-200 rounded-2xl p-6 md:p-8 bg-white shadow-sm hover:shadow-lg transition-all duration-300 w-full max-w-full overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-black text-lg overflow-hidden border-2 border-emerald-200">
                      {review.user_avatar ? (
                        <img
                          src={review.user_avatar}
                          alt={review.user_name || 'Пользователь'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (review.user_name || 'П').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-black text-lg text-gray-900">
                        {review.user_name || 'Пользователь'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 font-semibold">
                        {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const isActive = review.rating >= value;
                      return (
                        <Star
                          key={value}
                          className={isActive ? `w-5 h-5 ${getRatingColor(review.rating)}` : 'w-5 h-5 text-gray-200'}
                          fill={isActive ? 'currentColor' : 'none'}
                        />
                      );
                    })}
                  </div>
                </div>

                {review.text && (
                  <p className="text-lg text-gray-700 whitespace-pre-line break-words leading-relaxed font-semibold mb-4">
                    {review.text}
                  </p>
                )}

                <div className="mt-4">
                  <ReviewReactions
                    reviewId={review.id}
                    initialLikeCount={review.like_count}
                    initialDislikeCount={review.dislike_count}
                    initialUserReaction={review.user_reaction}
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      const reason = prompt('Причина жалобы (необязательно):') || '';
                      try {
                        const response = await fetch(`/api/reviews/${review.id}/report`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason }),
                        });
                        const data = await response.json();
                        if (response.status === 401) {
                          alert('Нужна авторизация, чтобы пожаловаться.');
                          return;
                        }
                        if (!response.ok) {
                          throw new Error(data.error || 'Не удалось отправить жалобу');
                        }
                        alert('Жалоба отправлена');
                      } catch (error: any) {
                        alert(error.message || 'Не удалось отправить жалобу');
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-rose-600 font-semibold transition-colors"
                  >
                    Пожаловаться на отзыв
                  </button>
                </div>

                {review.media.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {review.media.map((mediaItem, index) => (
                      <div
                        key={`${review.id}-${index}`}
                        className="relative h-40 md:h-48 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-emerald-400 transition-all duration-200"
                      >
                        {mediaItem.media_type === 'video' ? (
                          <video src={mediaItem.media_url} controls className="w-full h-full object-cover" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const imageIndex = imageItems.indexOf(mediaItem);
                              openViewer(imageUrls, Math.max(imageIndex, 0));
                            }}
                            className="block w-full h-full group"
                            aria-label="Открыть фото"
                          >
                            <Image src={mediaItem.media_url} alt="review media" fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="text-base font-black text-gray-900 mb-4">Комментарии</div>
                  {(localComments[review.id] || []).length > 0 && (
                    <div className="mt-4 space-y-4">
                      {(localComments[review.id] || []).map((comment, index) => (
                        <div
                          key={`${review.id}-comment-${index}`}
                          className="flex gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-black overflow-hidden text-sm border-2 border-emerald-200">
                            {comment.user_avatar ? (
                              <img
                                src={comment.user_avatar}
                                alt={comment.user_name || 'Пользователь'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (comment.user_name || 'П').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-600 mb-1">
                              {comment.user_name || 'Пользователь'} •{' '}
                              {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                            </div>
                            <div className="text-base text-gray-900 whitespace-pre-line break-words font-semibold">
                              {comment.message}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const reason = prompt('Причина жалобы (необязательно):') || '';
                                try {
                                  const response = await fetch(`/api/reviews/comments/${comment.id}/report`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ reason }),
                                  });
                                  const data = await response.json();
                                  if (response.status === 401) {
                                    alert('Нужна авторизация, чтобы пожаловаться.');
                                    return;
                                  }
                                  if (!response.ok) {
                                    throw new Error(data.error || 'Не удалось отправить жалобу');
                                  }
                                  alert('Жалоба отправлена');
                                } catch (error: any) {
                                  alert(error.message || 'Не удалось отправить жалобу');
                                }
                              }}
                              className="mt-2 text-sm text-gray-500 hover:text-rose-600 font-semibold transition-colors"
                            >
                              Пожаловаться
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCommentForms((prev) => ({
                          ...prev,
                          [review.id]: !prev[review.id],
                        }))
                      }
                      className="text-base text-emerald-700 hover:text-emerald-800 font-black transition-colors"
                    >
                      {commentForms[review.id] ? 'Скрыть форму' : 'Ответить'}
                    </button>
                  </div>

                  {commentForms[review.id] && (
                  <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-6">
                    <textarea
                      value={commentInputs[review.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [review.id]: e.target.value }))
                      }
                      onInput={handleTextareaInput}
                      onFocus={handleTextareaInput}
                      rows={3}
                      placeholder="Оставьте комментарий..."
                      className="w-full rounded-xl border-2 border-emerald-200 bg-white px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none overflow-hidden max-h-64 font-semibold"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const message = (commentInputs[review.id] || '').trim();
                          if (!message) return;
                          setCommentLoading((prev) => ({ ...prev, [review.id]: true }));
                          try {
                            const response = await fetch(`/api/reviews/${review.id}/comments`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ message }),
                            });
                            const data = await response.json();
                            if (response.status === 401) {
                              alert('Нужна авторизация, чтобы комментировать.');
                              return;
                            }
                            if (!response.ok) {
                              throw new Error(data.error || 'Не удалось сохранить комментарий');
                            }
                            const createdAt = data?.comment?.created_at || new Date().toISOString();
                            const commentId = data?.comment?.id || `local-${Date.now()}`;
                            setLocalComments((prev) => ({
                              ...prev,
                              [review.id]: [
                                ...(prev[review.id] || []),
                                {
                                  id: commentId,
                                  message,
                                  user_name: 'Вы',
                                  user_avatar: null,
                                  created_at: createdAt,
                                },
                              ],
                            }));
                            setCommentInputs((prev) => ({ ...prev, [review.id]: '' }));
                            setCommentForms((prev) => ({ ...prev, [review.id]: false }));
                          } catch (error: any) {
                            alert(error.message || 'Не удалось сохранить комментарий');
                          } finally {
                            setCommentLoading((prev) => ({ ...prev, [review.id]: false }));
                          }
                        }}
                        disabled={commentLoading[review.id]}
                        className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-base font-black hover:bg-emerald-700 disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {commentLoading[review.id] ? 'Отправка...' : 'Отправить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentInputs((prev) => ({ ...prev, [review.id]: '' }));
                          setCommentForms((prev) => ({ ...prev, [review.id]: false }));
                        }}
                        className="px-6 py-3 rounded-xl border-2 border-emerald-200 text-base text-emerald-700 hover:bg-emerald-50 font-black transition-all duration-200"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      <ImageViewerModal
        isOpen={viewerOpen}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

