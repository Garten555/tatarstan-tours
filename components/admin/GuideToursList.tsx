'use client';

import Link from 'next/link';
import { 
  MessageSquare, 
  Users, 
  Calendar, 
  MapPin,
  ArrowRight,
  Loader2,
  Award
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

interface GuideToursListProps {
  rooms: Array<{
    id: string;
    tour_id: string;
    is_active: boolean;
    created_at: string;
    tour: {
      id: string;
      title: string;
      start_date: string;
      end_date: string | null;
      city?: {
        name: string;
      };
    };
    participants_count: number;
  }>;
}

export default function GuideToursList({ rooms }: GuideToursListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-12 text-center">
        <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
          У вас пока нет назначенных туров
        </h2>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Администратор может назначить вас гидом для тура в разделе "Комнаты туров"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => {
        const isTourEnded = room.tour.end_date 
          ? new Date(room.tour.end_date) < new Date()
          : false;
        const isTourStarted = new Date(room.tour.start_date) <= new Date();

        return (
          <div
            key={room.id}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {escapeHtml(room.tour.title)}
                  </h2>
                  {isTourStarted && !isTourEnded && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Идет сейчас
                    </span>
                  )}
                  {isTourEnded && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      Завершен
                    </span>
                  )}
                  {!isTourStarted && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Предстоит
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(room.tour.start_date)}</span>
                    {room.tour.end_date && (
                      <span> - {formatDate(room.tour.end_date)}</span>
                    )}
                  </div>
                  {room.tour.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{escapeHtml(room.tour.city.name)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{room.participants_count} участников</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4" />
                    <span>Комната тура</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                    <Award className="w-4 h-4" />
                    <span>Выдача достижений доступна в комнате</span>
                  </div>
                </div>
              </div>

              <div className="ml-6 flex flex-col gap-2">
                <Link
                  href={`/tour-rooms/${room.id}?tab=participants`}
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2 font-medium transition-colors"
                  title="Выдать достижения участникам"
                >
                  <Award className="w-4 h-4" />
                  <span>Выдать достижения</span>
                </Link>
                <Link
                  href={`/tour-rooms/${room.id}`}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span>Открыть комнату</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

