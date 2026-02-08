'use client';

import { useState } from 'react';
import { 
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
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit
} from 'lucide-react';
import Link from 'next/link';

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
    price_per_person: number;
  };
}

interface BookingsListProps {
  bookings: Booking[];
  error: any;
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export default function BookingsList({ bookings, error }: BookingsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [items, setItems] = useState<Booking[]>(bookings);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Ошибка загрузки бронирований: {error.message}</p>
      </div>
    );
  }

  // Фильтрация бронирований
  const filteredBookings = items.filter((booking) => {
    const matchesSearch = 
      booking.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.tour?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || booking.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

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

  // Получение иконки способа оплаты
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

  // Получение названия способа оплаты
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      card: 'Карта',
      cash: 'Наличные',
      qr_code: 'QR-код',
    };
    return methods[method] || method;
  };

  // Получение названия статуса
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
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

  return (
    <div>
      {/* Фильтры и поиск */}
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поиск */}
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

          {/* Фильтр по статусу */}
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

          {/* Фильтр по оплате */}
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

      {/* Статистика */}
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Всего бронирований</div>
            <div className="text-4xl font-black text-gray-900">{items.length}</div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-yellow-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Ожидают подтверждения</div>
            <div className="text-4xl font-black text-yellow-600">
              {items.filter(b => b.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-green-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Подтверждено</div>
            <div className="text-4xl font-black text-green-600">
              {items.filter(b => b.status === 'confirmed').length}
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 hover:shadow-xl hover:border-emerald-400 transition-all duration-200">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Оплачено</div>
            <div className="text-4xl font-black text-emerald-600">
              {items.filter(b => b.payment_status === 'paid').length}
            </div>
          </div>
        </div>
      </div>

      {/* Список бронирований */}
      <div className="bg-white border-b border-gray-100 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-black text-gray-900">Бронирования не найдены</p>
          </div>
        ) : (
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
                {filteredBookings.map((booking) => (
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
                        href={`/tours/${booking.tour?.slug}`}
                        className="text-base text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                      >
                        {booking.tour?.title}
                      </Link>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(booking.tour?.start_date || '')}
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
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${getPaymentStatusColor(booking.payment_status)}`}>
                            {getPaymentStatusLabel(booking.payment_status)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
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
                        {booking.status !== 'cancelled' &&
                          !(booking.status === 'completed' && booking.payment_status === 'paid') && (
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
        )}
      </div>
    </div>
  );
}

