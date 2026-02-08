'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  MapPin, 
  CreditCard, 
  Banknote, 
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Phone
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface BookingFormProps {
  tour: any;
  user: SupabaseUser;
  savedCards: Array<{
    id: string;
    last_four_digits: string;
    card_type: string;
    cardholder_name?: string;
    is_default: boolean;
  }>;
}

type PaymentMethod = 'card' | 'cash' | 'qr_code';

type Traveler = {
  id: string;
  full_name: string;
  relationship?: string | null;
  is_child?: boolean;
  email?: string | null;
  phone?: string | null;
};

type Attendee = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  source: 'manual' | 'self' | 'saved';
  traveler_id?: string | null;
};

export default function BookingForm({ tour, user, savedCards }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [error, setError] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loadingTravelers, setLoadingTravelers] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
  
  // Данные формы
  const [formData, setFormData] = useState({
    num_people: 1,
    payment_method: 'card' as PaymentMethod,
    selected_card_id: savedCards.find(c => c.is_default)?.id || null,
    save_card: false,
    new_card: {
      number: '',
      expiry: '',
      cvv: '',
      cardholder_name: '',
      save: false,
    },
  });

  const totalPrice = tour.price_per_person * formData.num_people;
  const availableSpots = tour.max_participants - (tour.current_participants || 0);

  // Функция форматирования телефона с улучшенной маской
  const formatPhone = (value: string): string => {
    // Убираем все символы кроме цифр и +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Если пусто, возвращаем пустую строку
    if (cleaned.length === 0) {
      return '';
    }
    
    // Обработка разных форматов начала
    if (cleaned.startsWith('8')) {
      cleaned = '+7' + cleaned.slice(1);
    } else if (cleaned.startsWith('7') && !cleaned.startsWith('+7')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+7') && !cleaned.startsWith('+')) {
      cleaned = '+7' + cleaned;
    } else if (cleaned.startsWith('+') && !cleaned.startsWith('+7')) {
      cleaned = '+7' + cleaned.slice(1);
    }
    
    // Ограничиваем длину (максимум 12 цифр после +7 = 13 символов всего)
    cleaned = cleaned.slice(0, 13);
    
    // Если только +7, возвращаем как есть
    if (cleaned.length <= 2) {
      return cleaned;
    }
    
    // Извлекаем только цифры после +7
    const digits = cleaned.slice(2).replace(/\D/g, '');
    
    // Форматируем: +7 (900) 123-45-67
    let formatted = '+7';
    
    if (digits.length > 0) {
      formatted += ' (' + digits.slice(0, 3);
    }
    if (digits.length >= 4) {
      formatted += ') ' + digits.slice(3, 6);
    }
    if (digits.length >= 7) {
      formatted += '-' + digits.slice(6, 8);
    }
    if (digits.length >= 9) {
      formatted += '-' + digits.slice(8, 10);
    }
    
    return formatted;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        if (response.ok && data.profile) {
          setProfile(data.profile);
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadExistingBookings = async () => {
      try {
        const response = await fetch('/api/user/bookings');
        const data = await response.json();
        if (response.ok && Array.isArray(data.bookings)) {
          const hasBooking = data.bookings.some(
            (booking: any) =>
              booking.tour_id === tour.id && booking.status !== 'cancelled'
          );
          setHasExistingBooking(hasBooking);
        }
      } catch (err) {
        console.error('Ошибка загрузки бронирований:', err);
      }
    };
    loadExistingBookings();
  }, [tour.id]);

  useEffect(() => {
    const loadTravelers = async () => {
      setLoadingTravelers(true);
      try {
        const response = await fetch('/api/profile/travelers');
        const data = await response.json();
        if (response.ok && data.travelers) {
          setTravelers(data.travelers);
        }
      } catch (err) {
        console.error('Ошибка загрузки участников:', err);
      } finally {
        setLoadingTravelers(false);
      }
    };
    loadTravelers();
  }, []);

  useEffect(() => {
    const buildSelfAttendee = (): Attendee => ({
      full_name:
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || user.email || '',
      email: profile?.email || user.email || null,
      phone: profile?.phone || null,
      source: 'self',
      traveler_id: null,
    });

    setAttendees((prev) => {
      let next = [...prev];
      if (!hasExistingBooking && next.length === 0 && (profile || user.email)) {
        next = [buildSelfAttendee()];
      }
      if (next.length < formData.num_people) {
        const toAdd = formData.num_people - next.length;
        next = [
          ...next,
          ...Array.from({ length: toAdd }, () => ({
            full_name: '',
            email: null,
            phone: null,
            source: 'manual' as const,
            traveler_id: null,
          })),
        ];
      }
      if (next.length > formData.num_people) {
        next = next.slice(0, formData.num_people);
      }
      if (hasExistingBooking) {
        next = next.map((item) =>
          item.source === 'self'
            ? { full_name: '', email: null, phone: null, source: 'manual' as const, traveler_id: null }
            : item
        );
      }
      return next;
    });
  }, [formData.num_people, profile, user.email, hasExistingBooking]);

  // Валидация
  const validateForm = () => {
    if (formData.num_people < 1 || formData.num_people > availableSpots) {
      setError(`Количество участников должно быть от 1 до ${availableSpots}`);
      return false;
    }

    if (formData.payment_method === 'card') {
      if (!formData.selected_card_id && !formData.new_card.number) {
        setError('Выберите карту или введите данные новой карты');
        return false;
      }

      if (formData.new_card.number && (!formData.new_card.expiry || !formData.new_card.cvv || !formData.new_card.cardholder_name)) {
        setError('Заполните все поля карты');
        return false;
      }
    }

    if (attendees.length !== formData.num_people) {
      setError('Укажите данные всех участников');
      return false;
    }

    const hasMissingName = attendees.some(
      (attendee) => !attendee.full_name || attendee.full_name.trim().length < 2
    );
    if (hasMissingName) {
      setError('Заполните ФИО для всех участников');
      return false;
    }

    return true;
  };

  // Обработка бронирования
  const handleBooking = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const bookingData: any = {
        tour_id: tour.id,
        num_people: formData.num_people,
        total_price: totalPrice,
        payment_method: formData.payment_method,
        payment_status: formData.payment_method === 'cash' ? 'pending' : 'pending',
        attendees: attendees.map((a) => ({
          full_name: a.full_name,
          email: a.email || null,
          phone: a.phone || null,
          source: a.source,
          traveler_id: a.traveler_id || null,
        })),
      };

      // Если выбрана сохраненная карта
      if (formData.selected_card_id) {
        bookingData.payment_data = {
          card_id: formData.selected_card_id,
        };
      }

      // Если новая карта
      if (formData.new_card.number) {
        // Определяем тип карты
        const cardType = formData.new_card.number.startsWith('4') ? 'visa' :
                        formData.new_card.number.startsWith('5') ? 'mastercard' :
                        formData.new_card.number.startsWith('2') ? 'mir' : 'unknown';
        
        const lastFour = formData.new_card.number.slice(-4);
        
        bookingData.payment_data = {
          card_type: cardType,
          last_four_digits: lastFour,
          cardholder_name: formData.new_card.cardholder_name,
        };

        // Сохраняем карту если пользователь хочет
        if (formData.new_card.save) {
          bookingData.save_card = {
            last_four_digits: lastFour,
            card_type: cardType,
            cardholder_name: formData.new_card.cardholder_name,
            is_default: savedCards.length === 0, // Первая карта = по умолчанию
          };
        }
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось создать бронирование');
      }

      // Перенаправляем на страницу успеха
      router.push(`/booking/success?id=${result.booking.id}`);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при бронировании');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Навигация */}
      <Link
        href={`/tours/${tour.slug}`}
        className="group inline-flex items-center gap-2.5 text-gray-600 hover:text-emerald-600 transition-all duration-200 mb-8 px-4 py-2.5 rounded-xl hover:bg-white/80 hover:shadow-sm backdrop-blur-sm"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="font-medium">Назад к туру</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Левая колонка - форма */}
        <div className="lg:col-span-2 space-y-6">
          {/* Информация о туре */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-lg border border-gray-100/50 p-6 lg:p-8 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative w-full sm:w-40 h-40 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                <Image
                  src={tour.cover_image}
                  alt={tour.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3 sm:mb-4 break-words">
                  {tour.title}
                </h1>
                <div className="space-y-1.5 sm:space-y-2">
                  {tour.city && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base break-words">{tour.city.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base break-words">{formatDate(tour.start_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Шаг 1: Детали бронирования */}
          {step === 'details' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100/50 p-4 sm:p-5 md:p-6 lg:p-8 hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-5 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-gray-200">
                Детали бронирования
              </h2>

              <div className="space-y-6">
                {/* Количество участников */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-emerald-100">
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                    Количество участников <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.num_people > 1) {
                          setFormData(prev => ({ ...prev, num_people: prev.num_people - 1 }));
                        }
                      }}
                      disabled={formData.num_people <= 1}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-base sm:text-lg text-gray-700 hover:text-emerald-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={availableSpots}
                      value={formData.num_people}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setFormData(prev => ({ 
                          ...prev, 
                          num_people: Math.min(Math.max(1, value), availableSpots) 
                        }));
                      }}
                      className="w-20 sm:w-24 text-center px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 font-bold text-base sm:text-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.num_people < availableSpots) {
                          setFormData(prev => ({ ...prev, num_people: prev.num_people + 1 }));
                        }
                      }}
                      disabled={formData.num_people >= availableSpots}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-base sm:text-lg text-gray-700 hover:text-emerald-600"
                    >
                      +
                    </button>
                    <div className="flex-1 bg-white/80 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-emerald-200">
                      <span className="text-xs sm:text-sm font-medium text-emerald-700">
                        Доступно мест: <span className="font-bold text-base sm:text-lg">{availableSpots}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Участники */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5 md:mb-6">
                    <label className="block text-sm sm:text-base font-semibold text-gray-900">
                      Данные участников <span className="text-red-500">*</span>
                    </label>
                    <Link
                      href="/profile/settings"
                      className="group inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-xs sm:text-sm lg:text-base"
                    >
                      <Users className="w-4 h-4 lg:w-5 lg:h-5 group-hover:scale-110 transition-transform" />
                      <span>Управлять участниками</span>
                    </Link>
                  </div>
                  <div className="space-y-5">
                    {attendees.map((attendee, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-2xl p-5 lg:p-6 bg-gradient-to-br from-white to-gray-50/50 hover:border-emerald-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="font-bold text-lg text-gray-900">
                              Участник {index + 1}
                            </div>
                          </div>
                          {loadingTravelers ? (
                            <span className="text-sm text-gray-400">Загрузка...</span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Выбрать из сохранённых
                            </label>
                            <select
                              value={attendee.source === 'self' ? 'self' : attendee.traveler_id || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === 'self') {
                                  if (hasExistingBooking) {
                                    return;
                                  }
                                  setAttendees((prev) =>
                                    prev.map((item, idx) =>
                                      idx === index
                                        ? {
                                            full_name:
                                              profile?.first_name && profile?.last_name
                                                ? `${profile.first_name} ${profile.last_name}`
                                                : profile?.email || user.email || '',
                                            email: profile?.email || user.email || null,
                                            phone: profile?.phone || null,
                                            source: 'self',
                                            traveler_id: null,
                                          }
                                        : item
                                    )
                                  );
                                  return;
                                }

                                if (!value) {
                                  setAttendees((prev) =>
                                    prev.map((item, idx) =>
                                      idx === index
                                        ? {
                                            full_name: '',
                                            email: null,
                                            phone: null,
                                            source: 'manual',
                                            traveler_id: null,
                                          }
                                        : item
                                    )
                                  );
                                  return;
                                }

                                const traveler = travelers.find((t) => t.id === value);
                                if (traveler) {
                                  setAttendees((prev) =>
                                    prev.map((item, idx) =>
                                      idx === index
                                        ? {
                                            full_name: traveler.full_name,
                                            email: traveler.email || null,
                                            phone: traveler.phone || null,
                                            source: 'saved',
                                            traveler_id: traveler.id,
                                          }
                                        : item
                                    )
                                  );
                                }
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                            >
                              <option value="">Ввести вручную</option>
                              <option value="self" disabled={hasExistingBooking}>
                                {hasExistingBooking ? 'Я (уже забронирован)' : 'Я'}
                              </option>
                              {travelers.map((traveler) => (
                                <option key={traveler.id} value={traveler.id}>
                                  {traveler.full_name}
                                  {traveler.relationship ? ` (${traveler.relationship})` : ''}
                                  {traveler.is_child ? ' • ребёнок' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              ФИО <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={attendee.full_name}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAttendees((prev) =>
                                  prev.map((item, idx) =>
                                    idx === index
                                      ? {
                                          ...item,
                                          full_name: value,
                                          source: 'manual',
                                          traveler_id: null,
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                              placeholder="Иванов Иван Иванович"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Email <span className="text-xs font-normal text-gray-500">(необязательно)</span>
                            </label>
                            <input
                              type="email"
                              value={attendee.email || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAttendees((prev) =>
                                  prev.map((item, idx) =>
                                    idx === index
                                      ? { ...item, email: value, source: 'manual', traveler_id: null }
                                      : item
                                  )
                                );
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                              placeholder="email@example.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-emerald-600" />
                              <span>Телефон</span>
                              <span className="text-xs font-normal text-gray-500">(необязательно)</span>
                            </label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none z-10 group-focus-within:text-emerald-700 transition-colors">
                                <Phone className="w-5 h-5" />
                              </div>
                              <input
                                type="tel"
                                value={attendee.phone || ''}
                                onChange={(e) => {
                                  const formatted = formatPhone(e.target.value);
                                  setAttendees((prev) =>
                                    prev.map((item, idx) =>
                                      idx === index
                                        ? { ...item, phone: formatted, source: 'manual', traveler_id: null }
                                        : item
                                    )
                                  );
                                }}
                                onFocus={(e) => {
                                  if (!e.target.value || e.target.value === '') {
                                    const formatted = formatPhone('+7');
                                    setAttendees((prev) =>
                                      prev.map((item, idx) =>
                                        idx === index
                                          ? { ...item, phone: formatted, source: 'manual', traveler_id: null }
                                          : item
                                      )
                                    );
                                    // Устанавливаем курсор после +7 (
                                    setTimeout(() => {
                                      e.target.setSelectionRange(4, 4);
                                    }, 0);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Разрешаем удаление, но предотвращаем удаление +7
                                  if (e.key === 'Backspace' && attendee.phone && attendee.phone.length <= 4) {
                                    e.preventDefault();
                                    setAttendees((prev) =>
                                      prev.map((item, idx) =>
                                        idx === index
                                          ? { ...item, phone: '+7', source: 'manual', traveler_id: null }
                                          : item
                                      )
                                    );
                                  }
                                }}
                                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium text-lg transition-all duration-200 placeholder:text-gray-400 hover:border-emerald-300"
                                placeholder="+7 (900) 123-45-67"
                                maxLength={18}
                              />
                              {attendee.phone && attendee.phone.length > 2 && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    attendee.phone.replace(/\D/g, '').length === 12 
                                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                                      : 'bg-amber-400 shadow-sm shadow-amber-400/50'
                                  }`} title={attendee.phone.replace(/\D/g, '').length === 12 ? 'Телефон заполнен' : 'Заполните телефон'} />
                                </div>
                              )}
                            </div>
                            {attendee.phone && attendee.phone.length > 2 && (
                              <p className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
                                attendee.phone.replace(/\D/g, '').length === 12 
                                  ? 'text-emerald-600' 
                                  : 'text-amber-600'
                              }`}>
                                {attendee.phone.replace(/\D/g, '').length === 12 ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Телефон заполнен корректно</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Введите еще {12 - attendee.phone.replace(/\D/g, '').length} цифр</span>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Кнопка перехода к оплате */}
                <button
                  onClick={() => setStep('payment')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Перейти к оплате
                </button>
              </div>
            </div>
          )}

          {/* Шаг 2: Способ оплаты */}
          {step === 'payment' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100/50 p-4 sm:p-5 md:p-6 lg:p-8 hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-5 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-gray-200">
                Способ оплаты
              </h2>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5 md:mb-6">
                {/* Карта */}
                <label className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 ${
                  formData.payment_method === 'card'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked={formData.payment_method === 'card'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: 'card' }))}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0"
                  />
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 ${formData.payment_method === 'card' ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                    <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.payment_method === 'card' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="flex-1 font-bold text-sm sm:text-base md:text-lg text-gray-900 break-words">Банковская карта</span>
                </label>

                {/* Наличные */}
                <label className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 ${
                  formData.payment_method === 'cash'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={formData.payment_method === 'cash'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: 'cash' }))}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0"
                  />
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 ${formData.payment_method === 'cash' ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                    <Banknote className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.payment_method === 'cash' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="flex-1 font-bold text-sm sm:text-base md:text-lg text-gray-900 break-words">Наличными при встрече</span>
                </label>

                {/* QR-код */}
                <label className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 ${
                  formData.payment_method === 'qr_code'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="qr_code"
                    checked={formData.payment_method === 'qr_code'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: 'qr_code' }))}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0"
                  />
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 ${formData.payment_method === 'qr_code' ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                    <QrCode className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.payment_method === 'qr_code' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="flex-1 font-bold text-sm sm:text-base md:text-lg text-gray-900 break-words">QR-код</span>
                </label>
              </div>

              {/* Форма для карты */}
              {formData.payment_method === 'card' && (
                <div className="space-y-4 border-t pt-6">
                  {/* Сохраненные карты */}
                  {savedCards.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-gray-900 mb-4">
                        Сохраненные карты
                      </h3>
                      {savedCards.map((card) => (
                        <div
                          key={card.id}
                          className={`flex items-center gap-4 p-4 border-2 rounded-2xl transition-all duration-200 ${
                            formData.selected_card_id === card.id
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md'
                              : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                          }`}
                        >
                          <label className="flex-1 flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="selected_card"
                              checked={formData.selected_card_id === card.id}
                              onChange={() => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  selected_card_id: card.id,
                                  new_card: { number: '', expiry: '', cvv: '', cardholder_name: '', save: false }
                                }));
                              }}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-lg text-gray-900">
                                  {card.card_type.toUpperCase()} •••• {card.last_four_digits}
                                </div>
                                {card.cardholder_name && (
                                  <div className="text-sm font-medium text-gray-600 mt-1">{card.cardholder_name}</div>
                                )}
                              </div>
                              {card.is_default && (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">По умолчанию</span>
                              )}
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Удалить эту карту?')) {
                                const response = await fetch(`/api/user/cards/${card.id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  // Обновляем список карт
                                  window.location.reload();
                                }
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Удалить карту"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Новая карта */}
                  <div className="space-y-4 border-t-2 border-gray-200 pt-6">
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="selected_card"
                        checked={!formData.selected_card_id}
                        onChange={() => {
                          setFormData(prev => ({ ...prev, selected_card_id: null }));
                        }}
                        className="w-5 h-5 text-emerald-600"
                      />
                      <span className="text-base font-bold text-gray-900">
                        {savedCards.length > 0 ? 'Использовать другую карту' : 'Ввести данные карты'}
                      </span>
                    </label>

                    {!formData.selected_card_id && (
                      <div className="space-y-5 pl-6 bg-gray-50/50 rounded-2xl p-5 border border-gray-200">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Номер карты
                          </label>
                          <input
                            type="text"
                            maxLength={19}
                            value={formData.new_card.number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                              setFormData(prev => ({
                                ...prev,
                                new_card: { ...prev.new_card, number: value }
                              }));
                            }}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Срок действия
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={formData.new_card.expiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  new_card: { ...prev.new_card, expiry: value }
                                }));
                              }}
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              CVV
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={formData.new_card.cvv}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setFormData(prev => ({
                                  ...prev,
                                  new_card: { ...prev.new_card, cvv: value }
                                }));
                              }}
                              placeholder="123"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white font-medium transition-all duration-200"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Имя держателя карты
                          </label>
                          <input
                            type="text"
                            value={formData.new_card.cardholder_name}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                new_card: { ...prev.new_card, cardholder_name: e.target.value.toUpperCase() }
                              }));
                            }}
                            placeholder="IVAN IVANOV"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 uppercase bg-white font-medium transition-all duration-200"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.new_card.save}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                new_card: { ...prev.new_card, save: e.target.checked }
                              }));
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-600">
                            Сохранить карту для будущих покупок
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Информация для наличных */}
              {formData.payment_method === 'cash' && (
                <div className="border-t-2 border-gray-200 pt-6">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl">
                    <p className="text-base font-medium text-blue-900">
                      💵 Оплата наличными производится при встрече с гидом перед началом тура.
                    </p>
                  </div>
                </div>
              )}

              {/* Информация для QR-кода */}
              {formData.payment_method === 'qr_code' && (
                <div className="border-t-2 border-gray-200 pt-6">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl">
                    <p className="text-base font-medium text-blue-900 mb-5">
                      📱 После подтверждения бронирования вам будет отправлен QR-код для оплаты.
                    </p>
                    <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-sm">
                      <div className="w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mx-auto">
                        <QrCode className="w-24 h-24 text-gray-400" />
                      </div>
                      <p className="text-sm text-center text-gray-600 mt-4 font-medium">
                        QR-код будет сгенерирован после подтверждения
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ошибка */}
              {error && (
                <div className="mt-6 p-5 bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-300 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <span className="text-base font-medium text-red-900">{error}</span>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Назад
                </button>
                <button
                  onClick={handleBooking}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    'Забронировать'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка - итоговая информация */}
        <div className="lg:col-span-1">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100/50 p-6 lg:p-8 sticky top-24 hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-6 pb-4 border-b border-gray-200">
              К оплате
            </h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-600">Цена за человека</span>
                <span className="font-semibold text-gray-900">{tour.price_per_person.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-600">Количество участников</span>
                <span className="font-semibold text-gray-900">{formData.num_people}</span>
              </div>
              <div className="border-t-2 border-emerald-200 pt-4 mt-4 flex justify-between items-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl">
                <span className="text-lg font-bold text-gray-900">К оплате</span>
                <span className="text-2xl font-extrabold text-emerald-600">
                  {totalPrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            {/* Информация о туре */}
            <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(tour.start_date)}</span>
              </div>
              {tour.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{tour.city.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

