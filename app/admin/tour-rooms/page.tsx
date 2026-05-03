// Страница управления комнатами туров и назначения гидов
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Users, 
  Calendar, 
  MapPin, 
  Crown,
  UserPlus,
  Loader2,
  MessageSquare,
  Trash2,
  DoorOpen,
  Info,
  Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import ConfirmModal from '@/components/common/ConfirmModal';

type TourRoomsConfirm = null | {
  title: string;
  description: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  action: () => Promise<void>;
};

interface TourRoom {
  id: string;
  tour_id: string;
  guide_id: string | null;
  is_active: boolean;
  created_at: string;
  tour: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    cover_image?: string | null;
    city?: {
      name: string;
    };
  };
  guide?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  participants_count?: number;
}

export default function TourRoomsPage() {
  const [rooms, setRooms] = useState<TourRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [guideFilter, setGuideFilter] = useState<'all' | 'assigned' | 'none'>('all');
  const [participantsFilter, setParticipantsFilter] = useState<'all' | 'with' | 'empty'>('all');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [assigningGuide, setAssigningGuide] = useState(false);
  interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
  }
  interface Tour {
    id: string;
    title: string;
  }
  const [users, setUsers] = useState<User[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<TourRoomsConfirm>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    // Загружаем только комнаты при монтировании
    // Пользователей загружаем только при открытии модального окна (ленивая загрузка)
    loadRooms();
  }, []);

  useBodyScrollLock(showUserSelect || showCreateRoom || confirmDialog !== null);

  const handleConfirmDialog = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.action();
    } finally {
      setConfirmBusy(false);
      setConfirmDialog(null);
    }
  };

  const loadRooms = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const response = await fetch('/api/admin/tour-rooms');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки комнат:', error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Загружаем пользователей через API (быстрее, чем прямой запрос к БД)
      const response = await fetch('/api/admin/users/list');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      // В случае ошибки устанавливаем пустой массив, чтобы не блокировать UI
      setUsers([]);
    }
  };

  const loadTours = async () => {
    try {
      const response = await fetch('/api/admin/tours/filter?limit=100');
      const data = await response.json();
      
      if (data.tours) {
        setTours(data.tours || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки туров:', error);
      setTours([]);
    }
  };

  const createRoom = async () => {
    if (!selectedTourId) {
      alert('Выберите тур');
      return;
    }

    try {
      setCreatingRoom(true);
      const response = await fetch('/api/admin/tour-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tour_id: selectedTourId }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.room) {
          const nr = data.room as TourRoom;
          setRooms((prev) => [...prev, { ...nr, participants_count: nr.participants_count ?? 0 }]);
        } else {
          await loadRooms({ silent: true });
        }
        setShowCreateRoom(false);
        setSelectedTourId(null);
      } else {
        alert(data.error || 'Не удалось создать комнату');
      }
    } catch (error) {
      console.error('Ошибка создания комнаты:', error);
      alert('Ошибка создания комнаты');
    } finally {
      setCreatingRoom(false);
    }
  };

  const assignGuide = async (roomId: string, userId: string | null) => {
    try {
      setAssigningGuide(true);
      const response = await fetch(`/api/tour-rooms?room_id=${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guide_id: userId }),
      });

      const data = await response.json();
      
      if (data.success && data.room) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, ...(data.room as TourRoom) } : r))
        );
        setSelectedRoom(null);
        setShowUserSelect(false);
      } else {
        alert(data.error || 'Не удалось назначить гида');
      }
    } catch (error) {
      console.error('Ошибка назначения гида:', error);
      alert('Ошибка назначения гида');
    } finally {
      setAssigningGuide(false);
    }
  };

  const deleteRoom = (roomId: string) => {
    setConfirmDialog({
      title: 'Удалить комнату?',
      description:
        'Это действие удалит все сообщения, участников и медиа этой комнаты. Отменить будет нельзя.',
      variant: 'danger',
      confirmLabel: 'Удалить навсегда',
      action: async () => {
        try {
          setDeletingRoom(roomId);
          const response = await fetch(`/api/admin/tour-rooms/${roomId}`, {
            method: 'DELETE',
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            toast.error((data as { error?: string }).error || `Ошибка ${response.status}`);
            return;
          }

          if ((data as { success?: boolean }).success) {
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
            toast.success('Комната удалена');
          } else {
            toast.error((data as { error?: string }).error || 'Не удалось удалить комнату');
          }
        } catch (error) {
          console.error('Ошибка удаления комнаты:', error);
          toast.error('Ошибка удаления комнаты');
        } finally {
          setDeletingRoom(null);
        }
      },
    });
  };

  /** Те же правила, что у cron: комнаты туров, у которых end_date был более 14 дней назад. */
  const openRetentionCleanupConfirm = () => {
    setConfirmDialog({
      title: 'Очистить комнаты по сроку?',
      description:
        'Будут удалены комнаты туров, у которых дата окончания тура (end_date) была более 14 дней назад. Участники, сообщения и медиа этих комнат будут удалены.',
      variant: 'danger',
      confirmLabel: 'Удалить старые комнаты',
      action: async () => {
        try {
          setCleanupLoading(true);
          const res = await fetch('/api/admin/cleanup/tour-rooms', { method: 'POST' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast.error((data as { error?: string }).error || `Ошибка ${res.status}`);
            return;
          }
          const deleted = (data as { deleted?: number }).deleted ?? 0;
          toast.success((data as { message?: string }).message || `Удалено комнат: ${deleted}`);
          await loadRooms({ silent: true });
        } catch (e) {
          console.error(e);
          toast.error('Не удалось выполнить очистку');
        } finally {
          setCleanupLoading(false);
        }
      },
    });
  };

  const filteredRooms = rooms.filter((room) => {
    const count = room.participants_count ?? 0;
    if (guideFilter === 'assigned' && !room.guide_id) return false;
    if (guideFilter === 'none' && room.guide_id) return false;
    if (participantsFilter === 'with' && count === 0) return false;
    if (participantsFilter === 'empty' && count > 0) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const guideEmail = room.guide?.email?.toLowerCase() ?? '';
    return (
      room.tour.title.toLowerCase().includes(query) ||
      (room.tour.city?.name.toLowerCase().includes(query) ?? false) ||
      room.guide?.first_name.toLowerCase().includes(query) ||
      room.guide?.last_name.toLowerCase().includes(query) ||
      guideEmail.includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
        <p className="ml-4 text-xl font-bold text-gray-600">Загрузка комнат...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
      <div className="mb-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
                <span className="text-sm font-bold text-emerald-700">Комнаты туров</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
              <DoorOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Комнаты туров
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-700">
              Управление комнатами и назначение гидов
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openRetentionCleanupConfirm}
              disabled={cleanupLoading}
              className="px-4 py-3 border-2 border-slate-200 bg-white text-slate-800 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50"
              title="Удалить только комнаты с турами, завершёнными более 14 дней назад"
            >
              {cleanupLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Timer className="w-5 h-5 text-slate-600" />
              )}
              <span>Очистить по сроку (14 дн.)</span>
            </button>
            <button
              onClick={() => {
                setShowCreateRoom(true);
                if (tours.length === 0) {
                  loadTours();
                }
              }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-5 h-5" />
              <span>Создать комнату</span>
            </button>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 flex gap-3 items-start">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-slate-800 leading-relaxed">
            <strong className="font-bold">Удаление:</strong> у каждой комнаты есть кнопка «Удалить» — срочное удаление вручную (сообщения, участники, медиа).
            <br />
            <strong className="font-bold">Автоочистка:</strong> комнаты с турами, у которых прошло более{' '}
            <strong>14 дней</strong> после даты окончания тура (<code className="text-xs bg-white/80 px-1 rounded">end_date</code>
            ), можно регулярно снимать через cron (<code className="text-xs bg-white/80 px-1 rounded">POST /api/admin/cleanup/tour-rooms</code>
            ) или кнопкой выше.
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
          <input
            type="search"
            placeholder="Поиск по названию тура, городу, имени гида или email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Гид:</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all' as const, label: 'Все' },
                { id: 'assigned' as const, label: 'Назначен' },
                { id: 'none' as const, label: 'Без гида' },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setGuideFilter(id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                  guideFilter === id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 sm:ml-2">Участники:</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all' as const, label: 'Любые' },
                { id: 'with' as const, label: 'Есть в комнате' },
                { id: 'empty' as const, label: 'Пусто (0)' },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setParticipantsFilter(id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                  participantsFilter === id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/30'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Список комнат */}
      <div className="bg-white border-b border-gray-100 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <DoorOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-black text-gray-900">
              {searchQuery || guideFilter !== 'all' || participantsFilter !== 'all'
                ? 'Комнаты не найдены по фильтрам'
                : 'Пока нет комнат туров'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-400 p-6 transition-all duration-200">
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
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <Link
                        href={`/tours/${room.tour.id}`}
                        className="tour-room-title-link text-xl md:text-2xl font-black text-gray-900 hover:text-emerald-600 transition-colors"
                      >
                        {escapeHtml(room.tour.title)}
                      </Link>
                      {room.guide && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-xl text-sm font-bold">
                          <Crown className="w-4 h-4" />
                          <span>Гид назначен</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-base text-gray-700 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold">{formatDate(room.tour.start_date)}</span>
                        {room.tour.end_date && (
                          <span className="text-gray-500"> - {formatDate(room.tour.end_date)}</span>
                        )}
                      </div>
                      {room.tour.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold">{room.tour.city.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold">{room.participants_count || 0} участников</span>
                      </div>
                    </div>

                    {room.guide && (
                      <div className="mt-3 text-base">
                        <span className="text-gray-600 font-semibold">Гид: </span>
                        <span className="font-black text-gray-900">
                          {room.guide.first_name} {room.guide.last_name}
                        </span>
                        <span className="text-gray-500 ml-2">({room.guide.email})</span>
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    <Link
                      href={`/tour-rooms/${room.id}`}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>Открыть комнату</span>
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedRoom(room.id);
                        setShowUserSelect(true);
                        if (users.length === 0) {
                          loadUsers();
                        }
                      }}
                      disabled={assigningGuide}
                      className="px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-bold disabled:opacity-50 transition-all duration-200"
                    >
                      {assigningGuide && selectedRoom === room.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      <span>{room.guide ? 'Изменить гида' : 'Назначить гида'}</span>
                    </button>
                    <button
                      onClick={() => deleteRoom(room.id)}
                      disabled={deletingRoom === room.id}
                      className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2 font-bold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {deletingRoom === room.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        variant={confirmDialog?.variant ?? 'default'}
        confirmLabel={confirmDialog?.confirmLabel}
        busy={confirmBusy}
        onConfirm={() => void handleConfirmDialog()}
        onCancel={() => {
          if (!confirmBusy) setConfirmDialog(null);
        }}
      />

      {/* Модальное окно выбора гида */}
      {showUserSelect && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overscroll-contain">
          <div className="max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Crown className="w-7 h-7 text-emerald-600" />
              Выберите гида
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
              <button
                onClick={() => {
                  assignGuide(selectedRoom, null);
                }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 border-2 border-gray-200 transition-all duration-200"
              >
                <div className="font-bold text-base">Убрать гида</div>
                <div className="text-sm text-gray-500">Оставить без гида</div>
              </button>
              {users.map((user) => {
                const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim() || user.email?.[0]?.toUpperCase() || '?';
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      assignGuide(selectedRoom, user.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 px-4 py-3 text-left transition-all duration-200 hover:bg-gray-100"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full border-2 border-emerald-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-black text-white">
                        {initials.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="truncate text-sm text-gray-500">{user.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setShowUserSelect(false);
                setSelectedRoom(null);
              }}
              className="w-full px-4 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно создания комнаты */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overscroll-contain">
          <div className="max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <DoorOpen className="w-7 h-7 text-emerald-600" />
              Создать комнату для тура
            </h3>
            <div className="mb-6">
              <label className="block text-base font-bold text-gray-700 mb-2">
                Выберите тур
              </label>
              <select
                value={selectedTourId || ''}
                onChange={(e) => setSelectedTourId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              >
                <option value="">-- Выберите тур --</option>
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createRoom}
                disabled={!selectedTourId || creatingRoom}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-black transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {creatingRoom ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Создание...
                  </>
                ) : (
                  'Создать'
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setSelectedTourId(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

