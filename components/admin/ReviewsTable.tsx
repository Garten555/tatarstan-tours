'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, EyeOff } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ImageViewerModal from '@/components/common/ImageViewerModal';

type ReviewRow = {
  id: string;
  user_id: string;
  tour_id: string;
  rating: number;
  text: string | null;
  is_approved: boolean;
  is_published: boolean;
  is_reported: boolean;
  created_at: string;
  user_name: string;
  user_email: string;
  tour_title: string;
  media: { media_type: 'image' | 'video'; media_url: string }[];
};

type ReviewsTableProps = {
  initialReviews: ReviewRow[];
};

export default function ReviewsTable({ initialReviews }: ReviewsTableProps) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'reported'>('all');

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && review.is_approved) ||
        (statusFilter === 'pending' && !review.is_approved) ||
        (statusFilter === 'reported' && review.is_reported);
      if (!matchesStatus) return false;
      if (!query) return true;
      const haystack = [
        review.user_name,
        review.user_email,
        review.tour_title,
        review.text || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [reviews, searchQuery, statusFilter]);

  const handleApprove = async (reviewId: string) => {
    setApprovingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось одобрить отзыв');
      }
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? { ...review, is_approved: true, is_published: true } : review
        )
      );
      toast.success('Отзыв одобрен');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось одобрить отзыв');
    } finally {
      setApprovingId(null);
    }
  };

  const handleAction = async (reviewId: string, action: 'unpublish') => {
    setActionId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить действие');
      }
      setReviews((prev) =>
        prev.map((review) => {
          if (review.id !== reviewId) return review;
      return { ...review, is_published: false };
        })
      );
      toast.success('Снят с публикации');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось выполнить действие');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
      {/* Фильтры и поиск */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по пользователю, туру, тексту"
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'reported')
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
          >
            <option value="all">Все статусы</option>
            <option value="pending">На модерации</option>
            <option value="approved">Одобрено</option>
            <option value="reported">Жалобы</option>
          </select>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
          <span className="text-base font-bold text-gray-700">Найдено:</span>
          <span className="text-2xl font-black text-purple-700">{filteredReviews.length}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Тур
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Рейтинг
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Текст
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Медиа
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReviews.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center">
                  <p className="text-xl font-black text-gray-900">Отзывов пока нет</p>
                </td>
              </tr>
            )}
            {filteredReviews.map((review) => (
              <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-base text-gray-900">
                  <Link
                    href={`/admin/reviews/${review.id}`}
                    className="text-purple-700 hover:text-purple-800 font-bold text-left transition-colors"
                    title="Открыть отзыв"
                  >
                    {review.user_name || '—'}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">{review.user_email || '—'}</div>
                </td>
                <td className="px-6 py-4 text-base font-semibold text-gray-900">{review.tour_title || '—'}</td>
                <td className="px-6 py-4 text-base font-bold text-gray-900">{review.rating} / 5</td>
                <td className="px-6 py-4 text-base text-gray-700 max-w-md">
                  <div className="line-clamp-2">{review.text || '—'}</div>
                </td>
                <td className="px-6 py-4 text-base text-gray-700">
                  {review.media.length === 0 ? (
                    <span className="text-sm text-gray-400 font-semibold">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {review.media.map((item, index) => {
                        if (item.media_type === 'video') {
                          return (
                            <a
                              key={`${review.id}-${index}`}
                              href={item.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 transition-colors"
                              title="Открыть видео"
                            >
                              Видео
                            </a>
                          );
                        }

                        const imageItems = review.media.filter((media) => media.media_type === 'image');
                        const imageUrls = imageItems.map((media) => media.media_url);
                        const imageIndex = imageItems.findIndex((media) => media.media_url === item.media_url);

                        return (
                          <button
                            key={`${review.id}-${index}`}
                            type="button"
                            onClick={() => openViewer(imageUrls, Math.max(imageIndex, 0))}
                            className="block hover:opacity-80 transition-opacity"
                            title="Открыть изображение"
                          >
                            <img
                              src={item.media_url}
                              alt="review media"
                              className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 hover:border-purple-400 transition-colors"
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-base">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                      review.is_reported
                        ? 'bg-rose-100 text-rose-800'
                        : review.is_approved
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {review.is_reported
                      ? 'Жалоба'
                      : review.is_approved
                      ? 'Одобрено'
                      : 'На модерации'}
                  </span>
                </td>
                <td className="px-6 py-4 text-base font-semibold text-gray-700">
                  {new Date(review.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-6 py-4 text-base">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/reviews/${review.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base font-bold text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Подробнее
                    </Link>
                    {!review.is_approved && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={approvingId === review.id}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {approvingId === review.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        Одобрить
                      </button>
                    )}
                    {review.is_approved && (
                      <>
                        <button
                          onClick={() => handleAction(review.id, 'unpublish')}
                          disabled={actionId === review.id}
                          className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-all duration-200"
                        >
                          <EyeOff className="w-5 h-5" />
                          Снять
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ImageViewerModal
        isOpen={viewerOpen}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />

    </div>
  );
}


