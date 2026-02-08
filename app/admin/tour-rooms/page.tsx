// Страница управления комнатами туров и назначения гидов
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  DoorOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const router = useRouter();
  const supabase = createClient();
  const [rooms, setRooms] = useState<TourRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [assigningGuide, setAssigningGuide] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  useEffect(() => {
    // Загружаем только комнаты при монтировании
    // Пользователей загружаем только при открытии модального окна (ленивая загрузка)
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tour-rooms');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки комнат:', error);
    } finally {
      setLoading(false);
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
        await loadRooms();
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
      
      if (data.success) {
        await loadRooms();
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

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту комнату? Это действие удалит все сообщения, участников и медиа этой комнаты. Это действие нельзя отменить.')) {
      return;
    }

    try {
      setDeletingRoom(roomId);
      const response = await fetch(`/api/admin/tour-rooms/${roomId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadRooms();
      } else {
        alert(data.error || 'Не удалось удалить комнату');
      }
    } catch (error) {
      console.error('Ошибка удаления комнаты:', error);
      alert('Ошибка удаления комнаты');
    } finally {
      setDeletingRoom(null);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.tour.title.toLowerCase().includes(query) ||
      room.tour.city?.name.toLowerCase().includes(query) ||
      room.guide?.first_name.toLowerCase().includes(query) ||
      room.guide?.last_name.toLowerCase().includes(query)
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
          <button
            onClick={() => {
              setShowCreateRoom(true);
              if (tours.length === 0) {
                loadTours();
              }
            }}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-5 h-5" />
            <span>Создать комнату</span>
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="bg-white border-b border-gray-100 mb-8 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
          <input
            type="text"
            placeholder="Поиск по названию тура, городу, гиду..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
          />
        </div>
      </div>

      {/* Список комнат */}
      <div className="bg-white border-b border-gray-100 py-6 px-4 md:px-6 lg:px-8 -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <DoorOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-black text-gray-900">
              {searchQuery ? 'Комнаты не найдены' : 'Пока нет комнат туров'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-400 p-6 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Link
                        href={`/tours/${room.tour.id}`}
                        className="text-xl md:text-2xl font-black text-gray-900 hover:text-emerald-600 transition-colors"
                      >
                        {room.tour.title}
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

                  <div className="flex flex-col items-end gap-2">
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

      {/* Модальное окно выбора гида */}
      {showUserSelect && selectedRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
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
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    assignGuide(selectedRoom, user.id);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 border-2 border-gray-200 transition-all duration-200"
                >
                  <div className="font-bold text-base">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </button>
              ))}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
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

