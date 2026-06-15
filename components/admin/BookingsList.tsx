'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  XCircle,
  Search,
  Eye,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  getEffectiveBookingStatus,
  type BookingForReview,
} from '@/lib/bookings/review-eligibility';
import { canCancelBooking } from '@/lib/bookings/booking-cancellation';
import { getTourPageHrefForBooking } from '@/lib/tours/booking-tour-link';
import { GuideTourRoomsPagination } from '@/components/admin/GuideTourRoomsFiltersBar';

interface Booking {
  id: string;
  user_id: string;
  tour_id: string;
  booking_date: string;
  num_people: number;
  total_price: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  departure_start_at?: string | null;
  departure_end_at?: string | null;
  schedule_superseded_at?: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  tour: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date?: string | null;
    status?: string | null;
    price_per_person: number;
  };
  tour_session?: { start_at?: string | null; end_at?: string | null } | null;
}

type BookingsSummary = {
  total: number;
  pending: number;
  confirmed: number;
  paid: number;
};

function bookingForStatus(b: Booking): BookingForReview {
  const tour_session = Array.isArray(b.tour_session)
    ? b.tour_session[0] ?? null
    : b.tour_session ?? null;
  const tour = Array.isArray(b.tour) ? b.tour[0] ?? null : b.tour;
  return {
    status: b.status,
    departure_start_at: b.departure_start_at,
    departure_end_at: b.departure_end_at,
    schedule_superseded_at: b.schedule_superseded_at,
    tour_session,
    tour,
  };
}

function effectiveStatus(b: Booking): string {
  return getEffectiveBookingStatus(bookingForStatus(b));
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

const BOOKINGS_PER_PAGE = 20;

export default function BookingsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<BookingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, paymentFilter]);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(BOOKINGS_PER_PAGE),
        search: debouncedSearch,
        status: statusFilter,
        payment_status: paymentFilter,
        summary: page === 1 ? '1' : '0',
      });
      const response = await fetch(`/api/admin/bookings/list?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось загрузить бронирования');
      }
      setItems((data.bookings ?? []) as Booking[]);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      if (data.summary) {
        setSummary(data.summary as BookingsSummary);
      }
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      setFetchError((error as Error).message || 'Ошибка загрузки');
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, paymentFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      case 'qr_code':
        return <QrCode className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      card: 'Карта',
      cash: 'Наличные',
      qr_code: 'QR-код',
    };
    return methods[method] || method;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      confirmed: 'Подтверждено',
      cancelled: 'Отменено',
      completed: 'Завершено',
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      unpaid: 'Ожидает оплаты',
      paid: 'Оплачено',
      failed: 'Ошибка оплаты',
      refunded: 'Возврат',
    };
    return labels[status] || status;
  };

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', payment_status: 'refunded' }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Не удалось отменить бронь');
      }
      setItems((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled', payment_status: 'refunded' }
            : booking
        )
      );
    } catch (error) {
      console.error('Ошибка отмены бронирования:', error);
      alert((error as Error).message || 'Не удалось отменить бронь');
    } finally {
      setCancellingId(null);
    }
  };

  const showPagination = totalPages > 1;
  const hasFilters =
    Boolean(debouncedSearch) || statusFilter !== 'all' || paymentFilter !== 'all';

  if (fetchError && !loading && items.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Ошибка загрузки бронирований: {fetchError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени, email или туру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="confirmed">Подтверждено</option>
              <option value="cancelled">Отменено</option>
              <option value="completed">Завершено</option>
            </select>
          </div>
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
            >
              <option value="all">Все оплаты</option>
              <option value="pending">Ожидает оплаты</option>
              <option value="paid">Оплачено</option>
              <option value="failed">Ошибка оплаты</option>
              <option value="refunded">Возврат</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Всего бронирований</div>
            <div className="text-4xl font-black text-gray-900">{summary?.total ?? '—'}</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-yellow-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Ожидают подтверждения</div>
            <div className="text-4xl font-black text-yellow-600">{summary?.pending ?? '—'}</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-green-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Подтверждено</div>
            <div className="text-4xl font-black text-green-600">{summary?.confirmed ?? '—'}</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-emerald-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Оплачено</div>
            <div className="text-4xl font-black text-emerald-600">{summary?.paid ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-lg font-semibold">Загрузка бронирований...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-black text-gray-900">
              {hasFilters ? 'Бронирования не найдены по фильтрам' : 'Бронирования не найдены'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Тур
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Дата бронирования
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Участники
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Оплата
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-base font-semibold text-gray-900">
                            {booking.user?.first_name} {booking.user?.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{booking.user?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={getTourPageHrefForBooking({
                            ...bookingForStatus(booking),
                            id: booking.id,
                            schedule_superseded_at: booking.schedule_superseded_at,
                            tour: booking.tour,
                          })}
                          className="text-base text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                        >
                          {booking.tour?.title}
                        </Link>
                        <div className="text-sm text-gray-600 mt-1">
                          {booking.departure_start_at
                            ? formatDate(booking.departure_start_at)
                            : formatDate(booking.tour?.start_date || '')}
                          {booking.schedule_superseded_at && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                              прошлый выезд
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                        {formatDate(booking.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">
                        {booking.num_people}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-black text-gray-900">
                          {parseFloat(booking.total_price.toString()).toLocaleString('ru-RU')} ₽
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-emerald-600">
                            {getPaymentIcon(booking.payment_method)}
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-900">
                              {getPaymentMethodLabel(booking.payment_method)}
                            </div>
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${getPaymentStatusColor(booking.payment_status)}`}
                            >
                              {getPaymentStatusLabel(booking.payment_status)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${getStatusColor(effectiveStatus(booking))}`}
                        >
                          {getStatusLabel(effectiveStatus(booking))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-2 font-bold text-base transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                            Подробнее
                          </Link>
                          {canCancelBooking(bookingForStatus(booking)) && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-2 font-bold text-base disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="w-5 h-5" />
                              {cancellingId === booking.id ? 'Отмена...' : 'Отменить'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showPagination ? (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-600">
                  Показано {(page - 1) * BOOKINGS_PER_PAGE + 1}–
                  {Math.min(page * BOOKINGS_PER_PAGE, total)} из {total}
                </p>
                <GuideTourRoomsPagination
                  accent="emerald"
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
