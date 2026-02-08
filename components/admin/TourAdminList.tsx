'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Calendar, Users, Coins, Search, X, ChevronLeft, ChevronRight, Filter, Map } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useDialog } from '@/hooks/useDialog';

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
  current_participants: number;
  max_participants: number;
  cover_image: string | null;
  created_at: string;
}

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
  const { confirm, alert, DialogComponents } = useDialog();
  
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
      
      const [sortField, sortOrder] = sortBy.split('-');
      params.set('sort_by', sortField);
      params.set('sort_order', sortOrder);
      params.set('page', page.toString());
      params.set('limit', '12');

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

  const handleDelete = async (tourId: string) => {
    const confirmed = await confirm(
      'Вы уверены, что хотите удалить этот тур? Все связанные медиафайлы, бронирования и отзывы будут удалены. Это действие нельзя отменить.',
      'Удаление тура'
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
      'archived': 'Архивирован',
      'cancelled': 'Отменён',
    };
    return labels[status] || status;
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => (
        <div
          key={tour.id}
          className="group bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-2"
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
          <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
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
                tour.status
              )}`}
            >
              {getStatusLabel(tour.status)}
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4">
              {tour.title}
            </h3>

            {/* Stats */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Цена</div>
                  <div className="text-lg font-black text-gray-900">{tour.price_per_person} ₽ / чел</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Участники</div>
                  <div className="text-lg font-black text-gray-900">
                    {tour.current_participants} / {tour.max_participants}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wide">Дата</div>
                  <div className="text-lg font-black text-gray-900">
                    {new Date(tour.start_date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/admin/tours/${tour.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Edit className="w-5 h-5" />
                Изменить
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(tour.id);
                }}
                disabled={deletingId === tour.id}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                {deletingId === tour.id ? '...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="bg-white border-b border-gray-100 mt-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-5 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all flex items-center gap-2 font-bold text-base"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Назад
                </button>
                
                <div className="flex items-center gap-2">
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

                <span className="text-base font-bold text-gray-700 px-4">
                  Страница {page} из {totalPages}
                </span>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-5 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all flex items-center gap-2 font-bold text-base"
                >
                  Вперед
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {DialogComponents}
    </div>
  );
}
