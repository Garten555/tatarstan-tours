'use client';

import { useState } from 'react';
import ImageViewerModal from '@/components/common/ImageViewerModal';

type ReviewMedia = {
  media_type: 'image' | 'video';
  media_url: string;
};

type ReviewDetailsProps = {
  review: {
    id: string;
    rating: number;
    text: string | null;
    created_at: string;
    is_approved: boolean;
    is_published: boolean;
    is_reported: boolean;
    reported_at?: string | null;
    report_reason?: string | null;
    user_name: string;
    user_email: string | null;
    tour_title: string | null;
    media: ReviewMedia[];
    comments?: {
      id: string;
      message: string;
      created_at: string;
      is_reported: boolean | null;
      report_reason: string | null;
      user: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        avatar_url: string | null;
        is_banned: boolean | null;
      } | null;
    }[];
  };
};

export default function ReviewDetails({ review }: ReviewDetailsProps) {
  const [isApproved, setIsApproved] = useState(review.is_approved);
  const [isPublished, setIsPublished] = useState(review.is_published);
  const [isReported, setIsReported] = useState(review.is_reported);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const imageItems = review.media.filter((item) => item.media_type === 'image');
  const imageUrls = imageItems.map((item) => item.media_url);

  const openViewer = (index: number) => {
    setViewerImages(imageUrls);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{review.user_name}</h1>
          <p className="text-sm text-gray-500">{review.user_email || '—'}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(review.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isReported
              ? 'bg-rose-100 text-rose-800'
              : isApproved
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isReported ? 'Жалоба' : isApproved ? 'Одобрено' : 'На модерации'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            setActionLoading(true);
            setActionError(null);
            try {
              const response = await fetch(`/api/admin/reviews/${review.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || 'Не удалось одобрить отзыв');
              }
              setIsApproved(true);
              setIsPublished(true);
              setIsReported(false);
            } catch (error: any) {
              setActionError(error.message || 'Не удалось одобрить отзыв');
            } finally {
              setActionLoading(false);
            }
          }}
          disabled={actionLoading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          Одобрить
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Снять отзыв с публикации?')) return;
            setActionLoading(true);
            setActionError(null);
            try {
              const response = await fetch(`/api/admin/reviews/${review.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unpublish' }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || 'Не удалось снять с публикации');
              }
              setIsPublished(false);
            } catch (error: any) {
              setActionError(error.message || 'Не удалось снять с публикации');
            } finally {
              setActionLoading(false);
            }
          }}
          disabled={actionLoading}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Снять с публикации
        </button>
      </div>

      {actionError && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {actionError}
        </div>
      )}

      {review.is_reported && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          На отзыв поступила жалоба{review.report_reason ? `: ${review.report_reason}` : ''}.
        </div>
      )}


      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-500">Тур</div>
          <div className="text-base font-medium text-gray-900">{review.tour_title || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Рейтинг</div>
          <div className="text-base font-medium text-gray-900">{review.rating} / 5</div>
        </div>
      </div>


      <div className="mt-6">
        <div className="text-sm text-gray-500">Текст</div>
        <div className="mt-2 text-gray-800 whitespace-pre-line break-words">
          {review.text || '—'}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm text-gray-500">Медиа</div>
        {review.media.length === 0 ? (
          <div className="text-sm text-gray-400 mt-2">Нет</div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {review.media.map((item, index) => {
              if (item.media_type === 'video') {
                return (
                  <a
                    key={`${review.id}-${index}`}
                    href={item.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-2 text-xs rounded-full bg-gray-100 text-gray-600"
                  >
                    Видео
                  </a>
                );
              }

              const imageIndex = imageItems.findIndex((media) => media.media_url === item.media_url);

              return (
                <button
                  key={`${review.id}-${index}`}
                  type="button"
                  onClick={() => openViewer(Math.max(imageIndex, 0))}
                  className="block"
                  title="Открыть изображение"
                >
                  <img
                    src={item.media_url}
                    alt="review media"
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {review.comments && review.comments.length > 0 && (
        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-2">Комментарии</div>
          <div className="space-y-3">
            {review.comments.map((comment) => {
              const commenterName = comment.user
                ? [comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ')
                : 'Пользователь';
              return (
                <div
                  key={comment.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{commenterName}</div>
                      <div className="text-xs text-gray-500">
                        {comment.user?.email || '—'} •{' '}
                        {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    {comment.is_reported && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        Жалоба
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-900 mt-2 whitespace-pre-line break-words">
                    {comment.message}
                  </div>
                  {comment.report_reason && (
                    <div className="mt-2 text-xs text-rose-700">
                      Причина: {comment.report_reason}
                    </div>
                  )}
                  {comment.user && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const user = comment.user;
                          if (!user) {
                            return;
                          }
                          const reason = user.is_banned
                            ? ''
                            : prompt('Причина бана (необязательно):') || '';
                          const durationInput = user.is_banned
                            ? ''
                            : prompt('Срок бана в днях (0 = навсегда):') || '';
                          const durationDays = Number(durationInput || 0);
                          setActionLoading(true);
                          setActionError(null);
                          try {
                            const response = await fetch(`/api/admin/users/${user.id}/ban`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: user.is_banned ? 'unban' : 'ban',
                                reason,
                                permanent: !user.is_banned && (!durationDays || durationDays <= 0),
                                duration_days: !user.is_banned && durationDays > 0 ? durationDays : 0,
                              }),
                            });
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.error || 'Не удалось обновить бан');
                            }
                            user.is_banned = !user.is_banned;
                          } catch (error: any) {
                            setActionError(error.message || 'Не удалось обновить бан');
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                          comment.user.is_banned
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                            : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                        }`}
                      >
                        {comment.user.is_banned ? 'Снять бан' : 'Забанить'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

