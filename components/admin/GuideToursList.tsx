'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  Award,
  Search,
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
      cover_image: string | null;
      city?: {
        name: string;
      };
    };
    participants_count: number;
  }>;
}

type TourStatusFilter = 'all' | 'active' | 'upcoming' | 'ended';

export default function GuideToursList({ rooms }: GuideToursListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TourStatusFilter>('all');

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      const ended = room.tour.end_date ? new Date(room.tour.end_date) < new Date() : false;
      const started = new Date(room.tour.start_date) <= new Date();
      const active = started && !ended;
      const upcoming = !started;

      if (statusFilter === 'active' && !active) return false;
      if (statusFilter === 'upcoming' && !upcoming) return false;
      if (statusFilter === 'ended' && !ended) return false;

      if (!q) return true;
      const title = room.tour.title.toLowerCase();
      const city = room.tour.city?.name.toLowerCase() ?? '';
      return title.includes(q) || city.includes(q);
    });
  }, [rooms, searchQuery, statusFilter]);

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
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center shadow-lg">
        <MessageSquare className="mx-auto mb-6 h-20 w-20 text-gray-300" />
        <h2 className="mb-4 text-2xl font-black text-gray-900 md:text-3xl">
          У вас пока нет назначенных туров
        </h2>
        <p className="text-lg font-bold text-gray-700 md:text-xl">
          Администратор может назначить вас гидом для тура в разделе &quot;Комнаты туров&quot;
        </p>
      </div>
    );
  }

  const statusPills: { id: TourStatusFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Идёт сейчас' },
    { id: 'upcoming', label: 'Предстоит' },
    { id: 'ended', label: 'Завершён' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию тура или городу…"
            autoComplete="off"
            className="w-full rounded-xl border-2 border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 md:text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusPills.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                statusFilter === id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-lg font-bold text-gray-800">Туры не найдены</p>
          <p className="mt-1 text-sm text-gray-600">Измените поиск или фильтр по статусу</p>
        </div>
      ) : null}

      {filteredRooms.map((room) => {
        const isTourEnded = room.tour.end_date ? new Date(room.tour.end_date) < new Date() : false;
        const isTourStarted = new Date(room.tour.start_date) <= new Date();

        return (
          <div
            key={room.id}
            className="rounded-xl bg-white p-4 shadow-lg transition-shadow hover:shadow-xl md:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="relative h-28 w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-32 sm:w-40 md:h-36 md:w-44">
                  {room.tour.cover_image ? (
                    <img
                      src={room.tour.cover_image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                      Тур
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                      {escapeHtml(room.tour.title)}
                    </h2>
                    {isTourStarted && !isTourEnded && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        Идет сейчас
                      </span>
                    )}
                    {isTourEnded && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                        Завершен
                      </span>
                    )}
                    {!isTourStarted && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        Предстоит
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{formatDate(room.tour.start_date)}</span>
                      {room.tour.end_date && <span> — {formatDate(room.tour.end_date)}</span>}
                    </div>
                    {room.tour.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{escapeHtml(room.tour.city.name)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{room.participants_count} участников</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4" />
                      <span>Комната тура</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                      <Award className="h-4 w-4" />
                      <span>Выдача достижений в комнате</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 lg:ml-4 lg:min-w-[200px]">
                <Link
                  href={`/tour-rooms/${room.id}?tab=participants`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-600"
                  title="Выдать достижения участникам"
                >
                  <Award className="h-4 w-4" />
                  <span>Выдать достижения</span>
                </Link>
                <Link
                  href={`/tour-rooms/${room.id}`}
                  className="flex transform items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
                >
                  <span>Открыть комнату</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
