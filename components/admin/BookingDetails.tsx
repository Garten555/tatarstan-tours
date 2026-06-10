'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Calendar, 
  User, 
  MapPin, 
  Coins, 
  CreditCard, 
  Banknote, 
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Mail,
  Phone,
  Loader2,
  Edit
} from 'lucide-react';

import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import {
  getEffectiveBookingStatus,
  type BookingForReview,
} from '@/lib/bookings/review-eligibility';
import { getTourPageHrefForBooking } from '@/lib/tours/booking-tour-link';
import {
  getBookingDepartureEndForDisplay,
  getBookingDepartureStartForDisplay,
  isBookingDepartureSnapshotStale,
} from '@/lib/bookings/booking-display';

interface BookingDetailsProps {
  booking: any;
  attendees: any[];
}

export default function BookingDetails({ booking, attendees }: BookingDetailsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bookingForStatus = (): BookingForReview => {
    const tour_session = Array.isArray(booking.tour_session)
      ? booking.tour_session[0] ?? null
      : booking.tour_session ?? null;
    const tour = Array.isArray(booking.tour) ? booking.tour[0] ?? null : booking.tour;
    return {
      status: booking.status,
      departure_start_at: booking.departure_start_at,
      departure_end_at: booking.departure_end_at,
      schedule_superseded_at: booking.schedule_superseded_at,
      tour_session,
      tour,
    };
  };

  const departureStart = getBookingDepartureStartForDisplay(booking);
  const departureEnd = getBookingDepartureEndForDisplay(booking);
  const departureStale = isBookingDepartureSnapshotStale(bookingForStatus());

  const initialStatus = getEffectiveBookingStatus(bookingForStatus());
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(
    booking.payment_status === 'unpaid' ? 'pending' : booking.payment_status
  );
  const isLocked = currentStatus === 'completed' && currentPaymentStatus === 'paid';

  // Синхронизация состояний при обновлении booking
  useEffect(() => {
    setCurrentStatus(getEffectiveBookingStatus(bookingForStatus()));
    setCurrentPaymentStatus(
      booking.payment_status === 'unpaid' ? 'pending' : booking.payment_status
    );
  }, [booking.status, booking.payment_status, booking.departure_start_at, booking.departure_end_at, booking.schedule_superseded_at, booking.tour, booking.tour_session]);

  // Форматирование даты (Europe/Moscow)
  const formatDate = formatDateTimeShortRu;

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Получение цвета статуса оплаты
  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Получение названия способа оплаты
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      card: 'Банковская карта',
      cash: 'Наличными при встрече',
      qr_code: 'QR-код',
    };
    return methods[method] || method;
  };

  // Получение названия статуса
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждено',
      cancelled: 'Отменено',
      completed: 'Завершено',
    };
    return labels[status] || status;
  };

  // Получение названия статуса оплаты
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

  // Обновление статуса бронирования
  const updateStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    if (!confirm(`Изменить статус бронирования на "${getStatusLabel(newStatus)}"?`)) {
      // Если пользователь отменил, возвращаем значение обратно
      setCurrentStatus(booking.status);
      return;
    }

    // Оптимистичное обновление UI
    setCurrentStatus(newStatus);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Обновление статуса бронирования:', { 
        bookingId: booking.id, 
        oldStatus: currentStatus, 
        newStatus 
      });

      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Ошибка ответа:', result);
        // Возвращаем старое значение при ошибке
        setCurrentStatus(booking.status);
        throw new Error(
          [result.error, result.details].filter(Boolean).join(': ') || 'Не удалось обновить статус'
        );
      }

      console.log('✅ Статус обновлен успешно');
      // Обновляем страницу для синхронизации с БД
      router.refresh();
    } catch (err: any) {
      console.error('❌ Ошибка обновления статуса:', err);
      setError(err.message || 'Произошла ошибка при обновлении статуса');
      // Возвращаем старое значение
      setCurrentStatus(booking.status);
    } finally {
      setLoading(false);
    }
  };

  // Обновление статуса оплаты
  const updatePaymentStatus = async (newStatus: string) => {
    if (newStatus === currentPaymentStatus) return;
    
    if (!confirm(`Изменить статус оплаты на "${getPaymentStatusLabel(newStatus)}"?`)) {
      // Если пользователь отменил, возвращаем значение обратно
      setCurrentPaymentStatus(booking.payment_status);
      return;
    }

    // Оптимистичное обновление UI
    setCurrentPaymentStatus(newStatus);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Обновление статуса оплаты:', { 
        bookingId: booking.id, 
        oldStatus: currentPaymentStatus, 
        newStatus 
      });

      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Ошибка ответа:', result);
        // Возвращаем старое значение при ошибке
        setCurrentPaymentStatus(booking.payment_status);
        throw new Error(
          [result.error, result.details].filter(Boolean).join(': ') ||
            'Не удалось обновить статус оплаты'
        );
      }

      console.log('✅ Статус оплаты обновлен успешно');
      // Обновляем страницу для синхронизации с БД
      router.refresh();
    } catch (err: any) {
      console.error('❌ Ошибка обновления статуса оплаты:', err);
      setError(err.message || 'Произошла ошибка при обновлении статуса оплаты');
      // Возвращаем старое значение
      setCurrentPaymentStatus(booking.payment_status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Навигация */}
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Назад к списку бронирований</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Общая информация */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Информация о бронировании
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Пользователь</div>
                  <div className="font-medium text-gray-900">
                    {booking.user?.first_name} {booking.user?.last_name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {booking.user?.email}
                  </div>
                  {booking.user?.phone && (
                    <div className="text-sm text-gray-500">
                      {booking.user.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Тур</div>
                  <Link
                    href={getTourPageHrefForBooking({
                      ...bookingForStatus(),
                      id: booking.id,
                      schedule_superseded_at: booking.schedule_superseded_at,
                      tour: Array.isArray(booking.tour) ? booking.tour[0] : booking.tour,
                    })}
                    className="font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {booking.tour?.title}
                  </Link>
                  {booking.tour?.city && (
                    <div className="text-sm text-gray-500 mt-1">
                      {booking.tour.city.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Дата выезда по брони</div>
                  <div className="font-medium text-gray-900">
                    {departureStart ? formatDate(departureStart) : '—'}
                    {departureEnd && departureEnd !== departureStart
                      ? ` — ${formatDate(departureEnd)}`
                      : ''}
                  </div>
                  {departureStale && (
                    <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                      прошлый выезд / дата отличается от текущего расписания
                    </span>
                  )}
                  {booking.tour?.start_date &&
                    departureStart &&
                    formatDate(booking.tour.start_date) !== formatDate(departureStart) && (
                      <div className="text-xs text-gray-500 mt-2">
                        Актуальное расписание тура в каталоге: {formatDate(booking.tour.start_date)}
                      </div>
                    )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Количество участников</div>
                  <div className="font-medium text-gray-900">
                    {booking.num_people} {booking.num_people === 1 ? 'человек' : 'человека'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Coins className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Сумма</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {parseFloat(booking.total_price.toString()).toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {parseFloat(booking.tour?.price_per_person?.toString() || '0').toLocaleString('ru-RU')} ₽ за человека
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Участники */}
          {attendees.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Участники ({attendees.length})
              </h2>
              <div className="space-y-4">
                {attendees.map((attendee, index) => (
                  <div key={attendee.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="font-medium text-gray-900">
                      {index + 1}. {attendee.first_name} {attendee.last_name}
                      {attendee.middle_name && ` ${attendee.middle_name}`}
                    </div>
                    {attendee.email && (
                      <div className="text-sm text-gray-500 mt-1">{attendee.email}</div>
                    )}
                    {attendee.phone && (
                      <div className="text-sm text-gray-500">{attendee.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Статусы */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Статусы
            </h3>

            <div className="space-y-4">
              {/* Статус бронирования */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Статус бронирования</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                    {getStatusLabel(currentStatus)}
                  </span>
                </div>
                <select
                  name="booking_status"
                  value={currentStatus}
                  onChange={(e) => {
                    updateStatus(e.target.value);
                  }}
                  disabled={loading || isLocked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="pending">Ожидает подтверждения</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="cancelled">Отменено</option>
                  <option value="completed">Завершено</option>
                </select>
                {loading && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Обновление...
                  </div>
                )}
              </div>

              {/* Статус оплаты */}
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Статус оплаты</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(currentPaymentStatus)}`}>
                    {getPaymentStatusLabel(currentPaymentStatus)}
                  </span>
                </div>
                <select
                  name="payment_status"
                  value={currentPaymentStatus}
                  onChange={(e) => {
                    updatePaymentStatus(e.target.value);
                  }}
                  disabled={loading || isLocked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="pending">Ожидает оплаты</option>
                  <option value="paid">Оплачено</option>
                  <option value="failed">Ошибка оплаты</option>
                  <option value="refunded">Возврат</option>
                </select>
                {loading && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Обновление...
                  </div>
                )}
              </div>

              {/* Способ оплаты */}
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Способ оплаты</div>
                <div className="flex items-center gap-2">
                  {booking.payment_method === 'card' && <CreditCard className="w-5 h-5 text-gray-400" />}
                  {booking.payment_method === 'cash' && <Banknote className="w-5 h-5 text-gray-400" />}
                  {booking.payment_method === 'qr_code' && <QrCode className="w-5 h-5 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(booking.payment_method)}
                  </span>
                </div>
              </div>
            </div>

            {isLocked && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                Завершенное и оплаченное бронирование нельзя редактировать.
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}
          </div>

          {/* Дополнительная информация */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Дополнительно
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Дата бронирования:</span>
                <div className="font-medium text-gray-900">
                  {formatDate(booking.created_at)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">ID бронирования:</span>
                <div className="font-mono text-gray-900 text-xs">
                  {booking.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

