'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Calendar, Users, Coins, Search, X, ChevronLeft, ChevronRight, Filter, Map, Ban } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { parseClientSortParam } from '@/lib/tours/catalog-sort';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import { formatSessionRange } from '@/lib/tour/session-display';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface Tour {
  id: string;
  title: string;
  slug: string;
  price_per_person: number;
  tour_type: string;
  category: string;
  start_date: string;
  end_date: string;
  status: string;
  effective_status?: string;
  current_participants: number;
  max_participants: number;
  cover_image: string | null;
  created_at: string;
}

type CancelSessionOption = {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
};

type CancelPickerState = {
  tourId: string;
  tourTitle: string;
  sessions: CancelSessionOption[];
};

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активен' },
  { value: 'published', label: 'Опубликован' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
];

const TOUR_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'excursion', label: 'Экскурсия' },
  { value: 'hiking', label: 'Пеший тур' },
  { value: 'cruise', label: 'Круиз' },
  { value: 'bus_tour', label: 'Автобусный тур' },
  { value: 'walking_tour', label: 'Прогулка' },
];

const CATEGORIES = [
  { value: '', label: 'Все категории' },
  { value: 'history', label: 'История' },
  { value: 'nature', label: 'Природа' },
  { value: 'culture', label: 'Культура' },
  { value: 'architecture', label: 'Архитектура' },
  { value: 'food', label: 'Гастрономия' },
  { value: 'adventure', label: 'Приключения' },
];

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Новинки' },
  { value: 'created_at-asc', label: 'Старые' },
  { value: 'title-asc', label: 'Название: А-Я' },
  { value: 'title-desc', label: 'Название: Я-А' },
  { value: 'price_per_person-asc', label: 'Цена: по возрастанию' },
  { value: 'price_per_person-desc', label: 'Цена: по убыванию' },
];

export default function TourAdminList() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelPicker, setCancelPicker] = useState<CancelPickerState | null>(null);
  const [cancelTarget, setCancelTarget] = useState<'all' | string>('');
  const { confirm, alert, prompt, DialogComponents } = useDialog();

  useBodyScrollLock(Boolean(cancelPicker));
  
  // Фильтры и пагинация
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tourType, setTourType] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at-desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Загрузка туров
  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (tourType) params.set('tour_type', tourType);
      if (category) params.set('category', category);
      
      const { sortField, sortOrder } = parseClientSortParam(sortBy);
      params.set('sort_by', sortField);
      params.set('sort_order', sortOrder);
      params.set('page', page.toString());
      params.set('limit', '6');

      const response = await fetch(`/api/admin/tours/filter?${params.toString()}`);
      if (!response.ok) throw new Error('Ошибка загрузки туров');
      
      const data = await response.json();
      setTours(data.tours || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Ошибка загрузки туров:', error);
    } finally {
      setLoading(false);
    }
  }, [search, status, tourType, category, sortBy, page]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const hasActiveFilters = search || status || tourType || category;

  const runCancelTour = async (
    tourId: string,
    opts: { sessionId?: string; cancelAll?: boolean; reason?: string }
  ) => {
    setCancellingId(tourId);
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: opts.reason,
          session_id: opts.sessionId,
          cancel_all: opts.cancelAll ?? false,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Не удалось отменить тур');
      }
      await loadTours();
      const scope =
        opts.cancelAll || !opts.sessionId
          ? 'Тур отменён'
          : 'Выезд отменён';
      await alert(
        `${scope}, участники уведомлены по почте (если настроен SMTP).`,
        'Готово',
        'success'
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось отменить тур';
      await alert(message, 'Ошибка', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelTour = async (tourId: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const tour = tours.find((t) => t.id === tourId);
    if (!tour || tour.status === 'cancelled') return;

    try {
      const res = await fetch(`/api/admin/tours/${tourId}/sessions`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Не удалось загрузить выезды');
      }

      const sessions = ((data as { sessions?: CancelSessionOption[] }).sessions ?? []).filter(
        (s) => s.status !== 'cancelled'
      );

      if (sessions.length <= 1) {
        const only = sessions[0];
        const scopeLabel = only
          ? formatSessionRange(only.start_at, only.end_at)
          : formatSessionRange(tour.start_date, tour.end_date || null);

        const confirmed = await confirm(
          only
            ? `Будет отменён выезд ${scopeLabel}. Активные бронирования на этот слот аннулированы, участникам придёт письмо.`
            : 'Тур будет отмечен как отменённый, активные бронирования аннулированы. Участникам придёт письмо на почту.',
          'Отменить тур?',
          'warning',
          'Отменить',
          'Закрыть',
          'cancel'
        );
        if (!confirmed) return;

        const reason = await prompt(
          'Комментарий для участников (необязательно)',
          'Причина отмены',
          'Например: форс-мажор, погода…',
          ''
        );
        if (reason === null) return;

        await runCancelTour(tourId, {
          sessionId: only?.id,
          cancelAll: !only,
          reason: reason.trim() || undefined,
        });
        return;
      }

      setCancelTarget(sessions[0]?.id ?? 'all');
      setCancelPicker({
        tourId,
        tourTitle: tour.title,
        sessions,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось подготовить отмену';
      await alert(message, 'Ошибка', 'error');
    }
  };

  const handleCancelPickerConfirm = async () => {
    if (!cancelPicker) return;
    const { tourId, tourTitle, sessions } = cancelPicker;
    const cancelAll = cancelTarget === 'all';
    const session = sessions.find((s) => s.id === cancelTarget);
    if (!cancelAll && !session) return;

    const scopeLabel = cancelAll
      ? `все выезды тура «${tourTitle}»`
      : `выезд ${formatSessionRange(session!.start_at, session!.end_at)}`;

    setCancelPicker(null);

    const confirmed = await confirm(
      `Будет отменён: ${scopeLabel}. Активные бронирования аннулированы, участникам придёт письмо.`,
      'Подтвердить отмену',
      'warning',
      'Отменить',
      'Закрыть',
      'cancel'
    );
    if (!confirmed) return;

    const reason = await prompt(
      'Комментарий для участников (необязательно)',
      'Причина отмены',
      'Например: форс-мажор, погода…',
      ''
    );
    if (reason === null) return;

    await runCancelTour(tourId, {
      sessionId: cancelAll ? undefined : session!.id,
      cancelAll,
      reason: reason.trim() || undefined,
    });
  };

  const handleDelete = async (tourId: string) => {
    const confirmed = await confirm(
      'Вы уверены, что хотите удалить этот тур? Все связанные медиафайлы, бронирования и отзывы будут удалены. Это действие нельзя отменить.',
      'Удаление тура',
      'danger',
      'Удалить тур',
      'Закрыть',
      'delete'
    );
    
    if (!confirmed) {
      return;
    }

    setDeletingId(tourId);

    try {
      const response = await fetch(`/api/admin/tours/${tourId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить тур');
      }

      // Перезагружаем список туров
      await loadTours();
      await alert('Тур успешно удален', 'Успешно', 'success');
    } catch (error: any) {
      console.error('Error deleting tour:', error);
      await alert(error.message || 'Не удалось удалить тур', 'Ошибка', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'draft': 'Черновик',
      'published': 'Опубликован',
      'active': 'Активен',
      'completed': 'Завершён',
      'archived': 'Архивирован',
      'cancelled': 'Отменён',
    };
    return labels[status] || status;
  };

  const displayStatus = (tour: Tour) => tour.effective_status ?? tour.status;

  const canCancelTour = (tour: Tour) => {
    const status = displayStatus(tour);
    return status !== 'completed' && status !== 'cancelled';
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setTourType('');
    setCategory('');
    setSortBy('created_at-desc');
    setPage(1);
  };

  return (
    <div>
      {/* Фильтры и поиск */}
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        {/* Поиск */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию тура..."
            className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Кнопка фильтров */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 rounded-xl font-bold text-base transition-all duration-200 flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-emerald-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Фильтры
            {hasActiveFilters && (
              <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm font-black">
                {[status, tourType, category].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-5 py-3 text-base text-gray-600 hover:text-gray-900 flex items-center gap-2 font-bold transition-colors"
            >
              <X className="w-5 h-5" />
              Сбросить
            </button>
          )}
        </div>

        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t-2 border-gray-200">
            {/* Статус */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Статус</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Тип тура */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Тип тура</label>
              <select
                value={tourType}
                onChange={(e) => {
                  setTourType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
              >
                {TOUR_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Категория */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Категория</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
              >
                {CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Сортировка */}
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Сортировка</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Статистика */}
      {!loading && (
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-emerald-100/50 border-2 border-emerald-200/50 rounded-xl">
            <Map className="w-5 h-5 text-emerald-600" />
            <span className="text-base font-bold text-gray-700">Найдено туров:</span>
            <span className="text-2xl font-black text-emerald-700">{total}</span>
          </div>
        </div>
      )}

      {/* Загрузка */}
      {loading ? (
        <div className="bg-white border-b border-gray-100 py-12 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] text-center">
          <p className="text-xl font-black text-gray-900">Загрузка туров...</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="bg-white border-b border-gray-100 py-12 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] text-center">
          <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-black text-gray-900">
            {hasActiveFilters ? 'Туры не найдены по заданным фильтрам' : 'Туров пока нет. Создайте свой первый тур!'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      {tours.map((tour) => (
        <div
          key={tour.id}
          className="group min-w-0 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-2"
          role="link"
          tabIndex={0}
          onClick={() => router.push(`/admin/tours/${tour.id}/edit`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(`/admin/tours/${tour.id}/edit`);
            }
          }}
        >
          {/* Cover Image */}
          <div className="relative h-64 sm:h-72 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
            {tour.cover_image ? (
              <Image
                src={tour.cover_image}
                alt={tour.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Map className="w-16 h-16 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <span
              className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg ${getStatusColor(
                displayStatus(tour)
              )}`}
            >
              {getStatusLabel(displayStatus(tour))}
            </span>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-5 leading-snug">
              {tour.title}
            </h3>

            {/* Stats */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-10 h-10 shrink-0 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Цена</div>
                  <div className="text-lg font-black text-gray-900 break-words">
                    {tour.price_per_person} ₽ / чел
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Участники</div>
                  <div className="text-lg font-black text-gray-900">
                    {tour.current_participants} / {tour.max_participants}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-10 h-10 shrink-0 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wide">Дата и время</div>
                  <div className="text-lg font-black text-gray-900">
                    {formatDateTimeShortRu(tour.start_date)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/admin/tours/${tour.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="admin-tour-card-btn w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Edit className="w-5 h-5 shrink-0 text-white" />
                Изменить
              </Link>
              {canCancelTour(tour) && (
                <button
                  type="button"
                  onClick={(e) => handleCancelTour(tour.id, e)}
                  disabled={cancellingId === tour.id}
                  className="admin-tour-card-btn w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3.5 rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  <Ban className="w-5 h-5 shrink-0 text-white" />
                  {cancellingId === tour.id ? '…' : 'Отменить тур'}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(tour.id);
                }}
                disabled={deletingId === tour.id}
                className="admin-tour-card-btn w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3.5 rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5 shrink-0 text-white" />
                {deletingId === tour.id ? '...' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      ))}
          </div>

          {/* Пагинация */}
          {total > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl mt-8 py-6 px-4 sm:px-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all flex items-center justify-center gap-2 font-bold text-base"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Назад
                </button>

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          type="button"
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-12 h-12 rounded-xl font-black text-base transition-all ${
                            page === pageNum
                              ? 'bg-emerald-600 text-white shadow-lg'
                              : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                )}

                <span className="text-base font-bold text-gray-700 px-2 text-center">
                  Страница {page} из {totalPages} · туров: {total}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all flex items-center justify-center gap-2 font-bold text-base"
                >
                  Вперёд
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {cancelPicker ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-picker-title"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 id="cancel-picker-title" className="text-xl font-black text-gray-900">
                Какой выезд отменить?
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Тур «{cancelPicker.tourTitle}». Выберите конкретный экземпляр или все выезды сразу.
              </p>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-amber-400 transition-colors">
                <input
                  type="radio"
                  name="cancel-target"
                  className="mt-1"
                  checked={cancelTarget === 'all'}
                  onChange={() => setCancelTarget('all')}
                />
                <span>
                  <span className="block font-bold text-gray-900">Все выезды (весь тур)</span>
                  <span className="block text-sm text-gray-600 mt-0.5">
                    Отменить тур целиком и все будущие слоты
                  </span>
                </span>
              </label>
              {cancelPicker.sessions.map((session) => (
                <label
                  key={session.id}
                  className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <input
                    type="radio"
                    name="cancel-target"
                    className="mt-1"
                    checked={cancelTarget === session.id}
                    onChange={() => setCancelTarget(session.id)}
                  />
                  <span>
                    <span className="block font-bold text-gray-900">
                      {formatSessionRange(session.start_at, session.end_at)}
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5 capitalize">
                      Статус: {session.status}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setCancelPicker(null)}
                className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl font-bold hover:bg-gray-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => void handleCancelPickerConfirm()}
                disabled={!cancelTarget}
                className="flex-1 px-5 py-3 bg-amber-600 text-white rounded-xl font-black hover:bg-amber-700 disabled:opacity-50"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {DialogComponents}
    </div>
  );
}
