// Страница со списком комнат пользователя
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { escapeHtml } from '@/lib/utils/sanitize';
import { 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Users, 
  Crown,
  ArrowRight,
  Loader2,
  Clock,
  DoorOpen
} from 'lucide-react';

interface Room {
  id: string;
  tour_id: string;
  guide_id: string | null;
  is_active: boolean;
  created_at: string;
  role: 'participant' | 'guide';
  tour: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date: string | null;
    cover_image: string | null;
    city: {
      name: string;
    } | null;
  } | null;
  guide: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  participants_count: number;
}

export default function MyRoomsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      setUser(currentUser);
      loadRooms();
    };
    checkAuth();
  }, [router, supabase]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      // Добавляем таймаут для запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
      
      const response = await fetch('/api/user/rooms', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms || []);
      } else {
        console.error('Ошибка загрузки комнат:', data.error);
        alert(data.error || 'Не удалось загрузить комнаты');
      }
    } catch (error: any) {
      console.error('Ошибка загрузки комнат:', error);
      if (error.name === 'AbortError') {
        alert('Превышено время ожидания. Попробуйте обновить страницу.');
      } else {
        alert('Ошибка загрузки комнат. Проверьте консоль для деталей.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-xl text-gray-600">Загрузка комнат...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок в стиле главной страницы */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          {/* Бейдж */}
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
              <span className="text-sm font-bold text-emerald-700">Комнаты</span>
            </div>
          </div>

          {/* Главный заголовок */}
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3">
              <DoorOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Мои комнаты
            </h1>
          </div>

          {/* Описание */}
          <p className="text-base md:text-lg text-gray-600 mb-6">
            Управляйте своими турами и общайтесь с участниками
          </p>
        </div>
      </div>

      {/* Контент */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">

          {rooms.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 mb-2">У вас пока нет комнат</h3>
              <p className="text-base text-gray-600 mb-6">
                Комнаты появятся здесь после подтверждения бронирования тура или назначения гидом
              </p>
              <Link
                href="/tours"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Посмотреть туры
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const daysUntil = room.tour ? getDaysUntil(room.tour.start_date) : null;
              const isUpcoming = daysUntil !== null && daysUntil > 0;
              const isToday = daysUntil === 0;
              const isPast = daysUntil !== null && daysUntil < 0;

              return (
                <Link
                  key={room.id}
                  href={`/tour-rooms/${room.id}`}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 hover:border-emerald-400"
                >
                  {/* Обложка тура */}
                  {room.tour?.cover_image ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={room.tour.cover_image}
                        alt={room.tour.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {room.role === 'guide' && (
                        <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Гид
                        </div>
                      )}
                      {isToday && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Сегодня
                        </div>
                      )}
                      {isUpcoming && daysUntil && daysUntil <= 7 && (
                        <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Через {daysUntil} {daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <MessageSquare className="w-16 h-16 text-white/30" />
                      {room.role === 'guide' && (
                        <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Гид
                        </div>
                      )}
                    </div>
                  )}

                  {/* Контент карточки */}
                  <div className="p-6">
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {room.tour?.title ? escapeHtml(room.tour.title) : 'Комната тура'}
                    </h3>

                    {/* Информация о туре */}
                    {room.tour && (
                      <div className="space-y-3 mb-4">
                        {room.tour.city && (
                          <div className="flex items-center gap-2 text-gray-700 text-base">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            <span className="font-semibold">{escapeHtml(room.tour.city.name)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-700 text-base">
                          <Calendar className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold">{formatDate(room.tour.start_date)}</span>
                        </div>
                        {room.tour.end_date && (
                          <div className="flex items-center gap-2 text-gray-600 text-sm ml-7">
                            <Clock className="w-4 h-4" />
                            <span>До: {formatDate(room.tour.end_date)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Гид */}
                    {room.guide && room.role !== 'guide' && (
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                        {room.guide.avatar_url ? (
                          <img
                            src={room.guide.avatar_url}
                            alt={`${room.guide.first_name} ${room.guide.last_name}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
                            {room.guide.first_name[0]}{room.guide.last_name[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {escapeHtml(room.guide.first_name)} {escapeHtml(room.guide.last_name)}
                          </p>
                          <p className="text-xs text-gray-500">Гид</p>
                        </div>
                      </div>
                    )}

                    {/* Статистика */}
                    <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <span className="text-base font-bold">
                          {room.participants_count} {room.participants_count === 1 ? 'участник' : room.participants_count < 5 ? 'участника' : 'участников'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 group-hover:gap-3 transition-all">
                        <span className="text-base font-black">Открыть</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

