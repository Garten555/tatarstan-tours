'use client';

// Главный компонент комнаты тура - полностью переделанный дизайн
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourRoom as TourRoomType } from '@/types';
import { TourRoomChat } from './TourRoomChat';
import { TourRoomGallery } from './TourRoomGallery';
import { TourRoomParticipants } from './TourRoomParticipants';
import { 
  MessageSquare, 
  Image, 
  Users, 
  ArrowLeft,
  Calendar,
  MapPin,
  Crown,
  Loader2
} from 'lucide-react';
import { sanitizeText, escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';

interface TourRoomProps {
  roomId: string;
  initialRoom?: TourRoomType;
}

type TabType = 'chat' | 'gallery' | 'participants';

export function TourRoom({ roomId, initialRoom }: TourRoomProps) {
  // Проверяем параметр tab из URL
  const getInitialTab = (): TabType => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'participants' || tab === 'gallery' || tab === 'chat') {
        return tab as TabType;
      }
    }
    return 'chat';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [room, setRoom] = useState<TourRoomType | null>(initialRoom || null);
  const [loading, setLoading] = useState(!initialRoom);

  // Загружаем данные комнаты если не переданы
  useEffect(() => {
    if (!initialRoom) {
      loadRoom();
    }
    // Обновляем вкладку при изменении URL параметра
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tour-rooms/${roomId}`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('У вас нет доступа к этой комнате');
        } else {
          console.error('Ошибка загрузки комнаты:', response.status, response.statusText);
          toast.error('Ошибка загрузки комнаты. Попробуйте обновить страницу.');
        }
        return;
      }
      const data = await response.json();
      
      if (data.success) {
        setRoom(data.room);
      } else {
        console.error('Ошибка загрузки комнаты:', data.error);
        toast.error(data.error || 'Ошибка загрузки комнаты');
      }
    } catch (error) {
      console.error('Ошибка загрузки комнаты:', error);
      toast.error('Ошибка загрузки комнаты. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-600">Загрузка комнаты...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-red-500 text-lg">Комната не найдена</p>
            <Link
              href="/my-rooms"
              className="inline-flex items-center gap-2 mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к моим комнатам
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isGuide = (room as any).guide_id && (room as any).guide_id === (room as any).current_user_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Кнопка назад */}
        <Link
          href="/my-rooms"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Мои комнаты</span>
        </Link>

        {/* Шапка комнаты - улучшенный дизайн */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-gray-100">
          {/* Обложка тура */}
          {room.tour?.cover_image ? (
            <div className="relative h-72 md:h-96 overflow-hidden group">
              <img
                src={room.tour.cover_image}
                alt={room.tour.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 text-white">
                <div className="max-w-4xl">
                  <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">
                    {escapeHtml(room.tour.title)}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-lg">
                    {room.tour.city && (
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                        <MapPin className="w-5 h-5 text-emerald-300" />
                        <span className="font-medium">{escapeHtml(room.tour.city.name)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <Calendar className="w-5 h-5 text-emerald-300" />
                      <span className="font-medium">
                        {formatDate(room.tour.start_date)}
                        {room.tour.end_date && ` - ${formatDate(room.tour.end_date)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <div className="text-center text-white p-6 md:p-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{room.tour?.title ? escapeHtml(room.tour.title) : 'Комната тура'}</h1>
                {room.tour?.city && (
                  <div className="flex items-center justify-center gap-2 text-emerald-100 mb-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">{escapeHtml(room.tour.city.name)}</span>
                  </div>
                )}
                {room.tour && (
                  <div className="flex items-center justify-center gap-2 text-emerald-100">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg">
                      {formatDate(room.tour.start_date)}
                      {room.tour.end_date && ` - ${formatDate(room.tour.end_date)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Информация о гиде */}
          {room.guide && (
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {room.guide.avatar_url ? (
                  <img
                    src={room.guide.avatar_url}
                    alt={
                      (room.guide as any)?.first_name && (room.guide as any)?.last_name
                        ? `${(room.guide as any).first_name} ${(room.guide as any).last_name}`
                        : room.guide.full_name || 'Гид'
                    }
                    className="w-16 h-16 rounded-full object-cover border-4 border-emerald-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold border-4 border-emerald-100">
                    {(room.guide as any)?.first_name?.[0] || 'Г'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-semibold text-gray-900">
                      {(room.guide as any)?.first_name && (room.guide as any)?.last_name
                        ? escapeHtml(`${(room.guide as any).first_name} ${(room.guide as any).last_name}`)
                        : escapeHtml(room.guide.full_name || 'Гид')}
                    </span>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Гид
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">Ваш гид по туру</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Вкладки - улучшенный дизайн */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-6 py-5 text-sm font-bold transition-all duration-300 relative ${
                  activeTab === 'chat'
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <MessageSquare className={`w-5 h-5 ${activeTab === 'chat' ? 'text-emerald-600' : ''}`} />
                  <span>Чат</span>
                </div>
                {activeTab === 'chat' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex-1 px-6 py-5 text-sm font-bold transition-all duration-300 relative ${
                  activeTab === 'gallery'
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <Image className={`w-5 h-5 ${activeTab === 'gallery' ? 'text-emerald-600' : ''}`} />
                  <span>Галерея</span>
                </div>
                {activeTab === 'gallery' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 px-6 py-5 text-sm font-bold transition-all duration-300 relative ${
                  activeTab === 'participants'
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <Users className={`w-5 h-5 ${activeTab === 'participants' ? 'text-emerald-600' : ''}`} />
                  <span>Участники</span>
                </div>
                {activeTab === 'participants' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                )}
              </button>
            </div>
          </div>

          {/* Контент вкладок */}
          <div className={activeTab === 'chat' ? 'p-0 h-[calc(100vh-500px)] min-h-[700px]' : 'p-6 md:p-8'}>
            {activeTab === 'chat' && <TourRoomChat roomId={room.id} />}
            {activeTab === 'gallery' && <TourRoomGallery roomId={room.id} tourEndDate={room.tour?.end_date || null} />}
            {activeTab === 'participants' && <TourRoomParticipants roomId={room.id} guideId={room.guide_id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
