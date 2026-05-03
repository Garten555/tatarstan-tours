'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourRoom as TourRoomType } from '@/types';
import { TourRoomChat } from './TourRoomChat';
import { TourRoomGallery } from './TourRoomGallery';
import { TourRoomParticipants } from './TourRoomParticipants';
import { MessageSquare, Image, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';

interface TourRoomProps {
  roomId: string;
  initialRoom?: TourRoomType;
  viewerUserId?: string;
  galleryCanModerate?: boolean;
}

type TabType = 'chat' | 'gallery' | 'participants';

const NAV: { id: TabType; label: string; short: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Чат', short: 'Чат', icon: MessageSquare },
  { id: 'gallery', label: 'Медиа', short: 'Медиа', icon: Image },
  { id: 'participants', label: 'Участники', short: 'Люди', icon: Users },
];

function NavButton({
  active,
  onClick,
  label,
  caption,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  /** Полное название (подсказка) */
  label: string;
  /** Короткая подпись в боковой колонке — помещается в узкую полосу */
  caption: string;
  Icon: typeof MessageSquare;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-[10px] font-semibold leading-tight transition md:py-2.5 ${
        active
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
          : 'text-gray-600 hover:bg-gray-200/90 hover:text-gray-900'
      }`}
    >
      <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.25 : 2} />
      <span className="hidden max-w-full text-center md:block md:break-words">{caption}</span>
    </button>
  );
}

export function TourRoom({ roomId, initialRoom, viewerUserId, galleryCanModerate = false }: TourRoomProps) {
  const getInitialTab = (): TabType => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'participants' || tab === 'gallery' || tab === 'chat') return tab as TabType;
    }
    return 'chat';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [room, setRoom] = useState<TourRoomType | null>(initialRoom || null);
  const [loading, setLoading] = useState(!initialRoom);

  useEffect(() => {
    if (!initialRoom) loadRoom();
    const onPop = () => setActiveTab(getInitialTab());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [activeTab]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tour-rooms/${roomId}`);
      const data = await response.json();
      if (data.success) setRoom(data.room);
      else if (response.status === 403) toast.error(data.error || 'Нет доступа');
      else console.error('Комната:', data.error);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось загрузить комнату');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center bg-[#e8eef2] sm:top-16 lg:top-20">
        <div className="rounded-2xl bg-white px-10 py-12 text-center shadow-md">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-600">Загрузка комнаты…</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col items-center justify-center bg-[#e8eef2] px-4 sm:top-16 lg:top-20">
        <p className="mb-4 text-gray-700">Комната не найдена</p>
        <Link
          href="/my-rooms"
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          К моим комнатам
        </Link>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  const participantCount = Array.isArray((room as any).participants) ? (room as any).participants.length : 0;

  const subtitleParts: string[] = [];
  if (room.tour?.city?.name) subtitleParts.push(escapeHtml(room.tour.city.name));
  if (room.tour) {
    subtitleParts.push(
      `${formatDate(room.tour.start_date)}${room.tour.end_date ? ` — ${formatDate(room.tour.end_date)}` : ''}`
    );
  }
  if (participantCount > 0) subtitleParts.push(`${participantCount} в группе`);

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex min-h-0 flex-col bg-[#bfcbd4] sm:top-16 md:flex-row lg:top-20">
      {/* Левая колонка вкладок — только desktop; ширина под короткие подписи */}
      <aside className="hidden shrink-0 flex-col items-stretch gap-1.5 border-r border-gray-400/30 bg-[#dce4ea] px-2 py-3 md:flex md:w-[108px] lg:w-[118px]">
        <div className="mb-1 px-0.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-gray-600">
          Меню
        </div>
        {NAV.map(({ id, label, short, icon: Icon }) => (
          <NavButton
            key={id}
            active={activeTab === id}
            onClick={() => setActiveTab(id)}
            label={label}
            caption={short}
            Icon={Icon}
          />
        ))}
      </aside>

      {/* Основная колонка: шапка диалога + контент на всю высоту */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-start gap-2 border-b border-gray-300/80 bg-white px-2 py-2.5 shadow-sm sm:items-center sm:gap-3 sm:px-4">
          <Link
            href="/my-rooms"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 sm:mt-0"
            aria-label="Назад к комнатам"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {room.tour?.cover_image ? (
            <img
              src={room.tour.cover_image}
              alt=""
              className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-gray-100 sm:mt-0 sm:h-11 sm:w-11"
            />
          ) : (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-700 ring-2 ring-gray-100 sm:mt-0 sm:h-11 sm:w-11 sm:text-lg">
              {(room.tour?.title || 'Т')[0]}
            </div>
          )}

          <div className="min-w-0 flex-1 py-0.5 sm:py-0">
            <h1 className="break-words text-[15px] font-semibold leading-snug text-gray-900 line-clamp-3 sm:text-[17px] sm:leading-tight lg:line-clamp-2">
              {room.tour?.title ? escapeHtml(room.tour.title) : 'Комната тура'}
            </h1>
            <p className="mt-0.5 break-words text-xs leading-snug text-gray-500 line-clamp-3 sm:line-clamp-2">
              {subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Групповой чат'}
            </p>
          </div>
        </header>

        {/* Контент: flex-1 + min-h-0 чтобы лента чата растягивалась, поле ввода — внизу */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e9edef]">
          {activeTab === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <TourRoomChat roomId={room.id} variant="messenger" />
            </div>
          )}
          {activeTab === 'gallery' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
              <div className="mx-auto w-full max-w-4xl flex-1 p-4">
                <TourRoomGallery
                  roomId={room.id}
                  tourEndDate={room.tour?.end_date || null}
                  viewerUserId={viewerUserId}
                  canModerateGallery={galleryCanModerate}
                />
              </div>
            </div>
          )}
          {activeTab === 'participants' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
              <div className="mx-auto w-full max-w-4xl flex-1 p-4">
                <TourRoomParticipants roomId={room.id} guideId={room.guide_id} />
              </div>
            </div>
          )}
        </div>

        {/* Нижние вкладки — только телефон (на ПК разделы слева) */}
        <nav className="shrink-0 border-t border-gray-300/90 bg-white pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
          <div className="flex justify-around px-1">
            {NAV.map(({ id, label, short, icon: Icon }) => {
              const on = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                    on ? 'text-emerald-600' : 'text-gray-500'
                  }`}
                >
                  <span
                    className={`flex h-10 w-14 max-w-[90%] items-center justify-center rounded-2xl transition ${
                      on ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={on ? 2.25 : 2} />
                  </span>
                  <span className="truncate">{short}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
