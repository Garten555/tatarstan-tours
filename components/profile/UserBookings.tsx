'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  MapPin,
  Users,
  Coins,
  Download,
  CheckCircle2,
  Star,
  Clock,
  XCircle,
  Loader2,
  MessageSquare,
  BookOpen,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateTicketPDF } from '@/lib/pdf/ticket';
import ReviewModal from '@/components/reviews/ReviewModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Booking {
  id: string;
  tour_id: string;
  /** Слот выезда; если null — бронь по старой схеме без слотов */
  session_id?: string | null;
  tour_session?: { start_at: string; end_at?: string | null } | null;
  num_people: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  tour: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date?: string;
    cover_image: string;
    status?: string;
    city?: {
      name: string;
    };
  };
  review?: {
    id: string;
    rating?: number | null;
  } | null;
}

interface UserBookingsProps {
  isViewMode?: boolean;
}

export default function UserBookings({ isViewMode = false }: UserBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [roomIds, setRoomIds] = useState<Record<string, string>>({}); // booking.id -> room_id
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await fetch('/api/user/bookings');
        const data = await response.json();
        
        // Загружаем комнаты для подтвержденных бронирований
        if (data.bookings) {
          const confirmedBookings = data.bookings.filter(
            (b: Booking) => b.status === 'confirmed'
          );
          
          // Загружаем комнаты параллельно для всех подтвержденных бронирований
          const loadRooms = async () => {
            const roomPromises = confirmedBookings.map(async (booking: Booking) => {
              try {
                const qs = new URLSearchParams({ tour_id: booking.tour_id });
                if (booking.session_id) qs.set('session_id', booking.session_id);
                const roomResponse = await fetch(`/api/tour-rooms?${qs.toString()}`);
                if (!roomResponse.ok) return null;
                const roomData = await roomResponse.json();
                if (roomData.success && roomData.room) {
                  return { bookingId: booking.id, roomId: roomData.room.id };
                }
                return null;
              } catch (error) {
                // Игнорируем ошибки загрузки комнат
                return null;
              }
            });
            
            const results = await Promise.all(roomPromises);
            const roomIdsMap: Record<string, string> = {};
            results.forEach((result) => {
              if (result) {
                roomIdsMap[result.bookingId] = result.roomId;
              }
            });
            setRoomIds(roomIdsMap);
          };
          loadRooms();
        }
        if (data.bookings) {
          const normalized = data.bookings.map((booking: any) => {
            const tour = Array.isArray(booking.tour) ? booking.tour[0] || null : booking.tour || null;
            const rawSlot = booking.tour_session;
            const tour_session = rawSlot
              ? (Array.isArray(rawSlot) ? rawSlot[0] ?? null : rawSlot)
              : null;
            return {
              ...booking,
              tour_session: tour_session
                ? {
                    start_at: tour_session.start_at,
                    end_at: tour_session.end_at ?? null,
                  }
                : null,
              review: Array.isArray(booking.review) ? booking.review[0] || null : booking.review || null,
              tour: tour ? {
                ...tour,
                cover_image: tour.cover_image || null,
              } : null,
            };
          });
          setBookings(normalized);
        }
      } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const loadUser = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    loadUser();
    loadBookings();
  }, []);

  // Форматирование даты
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

  // Получение названия статуса
  const getStatusLabel = (status: string, tourStatus?: string) => {
    // Если тур завершен, показываем "Тур завершен" вместо статуса бронирования
    if (tourStatus === 'completed') {
      return 'Тур завершен';
    }
    const labels: Record<string, string> = {
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждено',
      cancelled: 'Отменено',
      completed: 'Завершено',
    };
    return labels[status] || status;
  };

  // Определяем завершение тура по фактической дате окончания,
  // чтобы метка не зависела только от синхронизации статуса в БД.
  const isTourCompleted = (booking: Booking) => {
    if (booking.tour?.status === 'completed') {
      return true;
    }
    // Если end_date нет, считаем датой завершения start_date
    // (для однодневных туров без отдельной даты окончания).
    const completionDate = booking.tour?.end_date || booking.tour?.start_date;
    if (!completionDate) return false;
    const endDate = new Date(completionDate);
    return !Number.isNaN(endDate.getTime()) && endDate.getTime() <= Date.now();
  };

  // Получение иконки статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  // Генерация PDF билета
  const handleConfirmCancelBooking = async () => {
    if (!cancelBooking) return;
    setCancellingId(cancelBooking.id);
    try {
      const response = await fetch(`/api/user/bookings/${cancelBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Не удалось отменить бронирование');
        return;
      }
      toast.success('Бронирование отменено');
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelBooking.id
            ? { ...b, status: 'cancelled', payment_status: 'refunded' }
            : b
        )
      );
      setRoomIds((prev) => {
        const next = { ...prev };
        delete next[cancelBooking.id];
        return next;
      });
      setCancelBooking(null);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadTicket = async (booking: Booking) => {
    setGeneratingPDF(booking.id);
    try {
      await generateTicketPDF(booking);
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
      alert('Не удалось сгенерировать билет');
    } finally {
      setGeneratingPDF(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          {isViewMode ? 'Бронирования' : 'Мои бронирования'}
        </h2>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">
            {isViewMode ? 'Нет бронирований' : 'У вас пока нет бронирований'}
          </p>
          {!isViewMode && (
            <Link
              href="/tours"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Посмотреть доступные туры →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {isViewMode ? 'Бронирования' : 'Мои бронирования'}
      </h2>

      <div className="space-y-4">
        {bookings.map((booking) => {
          if (!booking.tour) {
            return null; // Пропускаем бронирования без тура
          }

          const completedByDate = isTourCompleted(booking);
          const effectiveStatus = completedByDate && booking.status === 'confirmed'
            ? 'completed'
            : booking.status;

          const canCancelBooking =
            !isViewMode &&
            !completedByDate &&
            (booking.status === 'confirmed' || booking.status === 'pending');

          return (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Изображение тура */}
                <div className="relative w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                  {booking.tour?.cover_image ? (
                    <Image
                      src={booking.tour.cover_image}
                      alt={booking.tour.title || 'Тур'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 192px"
                      unoptimized={booking.tour.cover_image?.includes('s3.twcstorage.ru')}
                      onError={(e) => {
                        // Если изображение не загрузилось, скрываем его
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                      <BookOpen className="w-12 h-12 text-emerald-600 opacity-50" />
                    </div>
                  )}
                </div>

                {/* Информация */}
                <div className="flex-1 space-y-4">
                  <div>
                    <Link
                      href={`/tours/${booking.tour.slug}`}
                      className="text-xl font-semibold text-gray-900 hover:text-emerald-600 transition-colors"
                    >
                      {booking.tour.title}
                    </Link>
                  {booking.tour.city && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{booking.tour.city.name}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(booking.tour.start_date)}
                      {booking.tour.end_date ? ` — ${formatDate(booking.tour.end_date)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{booking.num_people} {booking.num_people === 1 ? 'участник' : 'участника'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-gray-900">
                      {parseFloat(booking.total_price.toString()).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${completedByDate ? 'bg-gray-100 text-gray-700' : getStatusColor(effectiveStatus)}`}>
                      {completedByDate ? <CheckCircle2 className="w-3 h-3" /> : getStatusIcon(effectiveStatus)}
                      {getStatusLabel(effectiveStatus, completedByDate ? 'completed' : booking.tour?.status)}
                    </span>
                  </div>
                </div>

                {completedByDate && (
                  <div className="text-sm font-medium text-gray-700">
                    Завершён:{' '}
                    <span className="font-semibold text-gray-900">
                      {formatDate(booking.tour.end_date || booking.tour.start_date)}
                    </span>
                  </div>
                )}


                {/* Действия */}
                <div className="flex gap-3 pt-2 flex-wrap">
                  <Link
                    href={`/tours/${booking.tour.slug}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Подробнее о туре
                  </Link>
                  {canCancelBooking && (
                    <button
                      type="button"
                      onClick={() => setCancelBooking(booking)}
                      disabled={cancellingId === booking.id}
                      className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {cancellingId === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                      Отменить бронирование
                    </button>
                  )}
                  {['confirmed', 'completed'].includes(effectiveStatus) && roomIds[booking.id] && (
                    <Link
                      href={`/tour-rooms/${roomIds[booking.id]}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Комната тура
                    </Link>
                  )}
                  {['completed', 'cancelled'].includes(effectiveStatus) && !booking.review?.id && (
                    <button
                      onClick={() => setReviewBooking(booking)}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Оставить отзыв
                    </button>
                  )}
                  {booking.review?.id && (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Отзыв отправлен
                    </span>
                  )}
                  {!isViewMode && effectiveStatus !== 'cancelled' && (
                    <button
                      onClick={() => handleDownloadTicket(booking)}
                      disabled={generatingPDF === booking.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {generatingPDF === booking.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Генерация...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Скачать билет
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!cancelBooking}
        title="Отменить бронирование?"
        message={
          cancelBooking?.tour?.title
            ? `Отменить бронирование тура «${cancelBooking.tour.title}»? Места будут освобождены. Вопросы по возврату средств можно уточнить в поддержке.`
            : 'Отменить это бронирование?'
        }
        confirmText="Да, отменить"
        variant="danger"
        onConfirm={handleConfirmCancelBooking}
        onCancel={() => !cancellingId && setCancelBooking(null)}
      />

      {reviewBooking && (
        <ReviewModal
          bookingId={reviewBooking.id}
          tourId={reviewBooking.tour_id}
          tourTitle={reviewBooking.tour.title}
          isOpen={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => {
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === reviewBooking.id
                  ? { ...booking, review: { id: 'submitted' } }
                  : booking
              )
            );
            setReviewBooking(null);
          }}
        />
      )}
    </div>
  );
}

