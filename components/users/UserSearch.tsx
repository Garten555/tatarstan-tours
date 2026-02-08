'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, Loader2, Users, Star, X, UserCheck, UserX } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_level: number;
  reputation_score: number;
}

type TabType = 'search' | 'friends';

export default function UserSearch() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        loadFriends();
        if (activeTab === 'friends') {
          loadFriendsList();
        }
      }
    };
    getCurrentUser();
  }, [supabase]);

  useEffect(() => {
    if (activeTab === 'friends' && currentUserId) {
      loadFriendsList();
    }
  }, [activeTab, currentUserId]);

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/users/friends?status=accepted');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            const friendIds = new Set<string>(data.friends.map((f: any) => f.friend_id));
            setFriends(friendIds);
          }
        }
      }

      const pendingResponse = await fetch('/api/users/friends?status=pending');
      if (pendingResponse.ok) {
        const contentType = pendingResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const pendingData = await pendingResponse.json();
          if (pendingData.success) {
            const pendingIds = new Set<string>(
              pendingData.friends
                .filter((f: any) => f.is_requested_by_me)
                .map((f: any) => f.friend_id)
            );
            setPendingRequests(pendingIds);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  };

  const loadFriendsList = async () => {
    try {
      setLoadingFriends(true);
      const response = await fetch('/api/users/friends?status=accepted');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setFriendsList(data.friends || []);
            const friendIds = new Set<string>(data.friends.map((f: any) => f.friend_id));
            setFriends(friendIds);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки списка друзей:', error);
      toast.error('Не удалось загрузить список друзей');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Удалить из друзей?')) return;
    
    try {
      const response = await fetch('/api/users/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: friendId, action: 'remove' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFriendsList((prev) => prev.filter((f: any) => f.friend_id !== friendId));
          setFriends((prev) => {
            const newSet = new Set(prev);
            newSet.delete(friendId);
            return newSet;
          });
          toast.success('Удален из друзей');
        } else {
          toast.error(data.error || 'Не удалось удалить из друзей');
        }
      } else {
        toast.error('Не удалось удалить из друзей');
      }
    } catch (error) {
      console.error('Ошибка удаления из друзей:', error);
      toast.error('Не удалось удалить из друзей');
    }
  };

  const searchUsers = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setUsers(data.users || []);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers(query);
  };

  const handleAddFriend = async (userId: string) => {
    try {
      const response = await fetch('/api/users/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: userId, action: 'request' }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setPendingRequests((prev) => new Set([...prev, userId]));
          } else {
            alert(data.error || 'Не удалось отправить запрос');
          }
        }
      } else {
        alert('Не удалось отправить запрос');
      }
    } catch (error) {
      console.error('Ошибка добавления в друзья:', error);
      alert('Не удалось отправить запрос');
    }
  };

  const getUserName = (user: User) => {
    return user.display_name || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь';
  };

  const getInitials = (user: User) => {
    const name = getUserName(user);
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Вкладки */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-base transition-all duration-200 ${
              activeTab === 'search'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              <span>Поиск</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-base transition-all duration-200 ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              <span>Друзья</span>
            </div>
          </button>
        </div>
      </div>

      {/* Поиск */}
      {activeTab === 'search' && (
        <>
          <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Поиск по имени пользователя, username или описанию..."
                className="w-full pl-14 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-base md:text-lg"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setUsers([]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>

          {/* Результаты */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-600" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
          </div>
          <p className="mt-6 text-gray-700 text-xl font-bold">Поиск пользователей...</p>
        </div>
      ) : users.length > 0 ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">
              Найдено пользователей: {users.length}
            </span>
          </div>
          
          <div className="grid gap-4 md:gap-6">
            {users.map((user, index) => {
              const isFriend = friends.has(user.id);
              const isPending = pendingRequests.has(user.id);
              const isMe = user.id === currentUserId;

              return (
                <div
                  key={user.id}
                  className="group bg-white rounded-2xl border-2 border-gray-100 p-6 md:p-8 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                    {/* Аватар */}
                    <Link href={`/users/${user.username || user.id}`} className="flex-shrink-0">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={getUserName(user)}
                          width={80}
                          height={80}
                          className="rounded-2xl object-cover border-2 border-emerald-100 group-hover:border-emerald-300 transition-colors"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-black border-2 border-emerald-100 group-hover:border-emerald-300 transition-colors">
                          {getInitials(user)}
                        </div>
                      )}
                    </Link>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/users/${user.username || user.id}`}>
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 hover:text-emerald-600 transition-colors mb-2">
                          {getUserName(user)}
                        </h3>
                      </Link>
                      
                      {user.username && (
                        <p className="text-base md:text-lg text-gray-500 font-medium mb-3">
                          @{user.username}
                        </p>
                      )}
                      
                      {user.bio && (
                        <p className="text-base md:text-lg text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                          {user.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-base md:text-lg">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold">
                          <Star className="w-5 h-5 fill-current" />
                          <span>{user.reputation_score || 0} опыта</span>
                        </div>
                        {user.status_level > 0 && (
                          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm">
                            Уровень {user.status_level}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Действия */}
                    {!isMe && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        {isFriend ? (
                          <span className="px-6 py-3 bg-emerald-100 text-emerald-700 rounded-xl text-base font-bold text-center">
                            Друг
                          </span>
                        ) : isPending ? (
                          <span className="px-6 py-3 bg-amber-100 text-amber-700 rounded-xl text-base font-bold text-center">
                            Запрос отправлен
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAddFriend(user.id)}
                              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-300 hover:shadow-lg hover:scale-105 text-base font-bold flex items-center justify-center gap-2"
                            >
                              <UserPlus className="w-5 h-5" />
                              Добавить в друзья
                            </button>
                            <Link
                              href={`/messenger?user=${user.id}`}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 text-base font-bold flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-5 h-5" />
                              Написать
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : query.length >= 2 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Пользователи не найдены
          </h2>
          <p className="text-gray-600 mb-8 text-xl max-w-md mx-auto font-medium">
            Попробуйте изменить поисковый запрос
          </p>
          <button
            onClick={() => {
              setQuery('');
              setUsers([]);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-bold text-base"
          >
            <X className="w-5 h-5" />
            Очистить поиск
          </button>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
            <Search className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Начните поиск
          </h2>
          <p className="text-gray-600 text-xl max-w-md mx-auto font-medium">
            Введите имя пользователя, username или описание для поиска
          </p>
        </div>
      )}
        </>
      )}

      {/* Список друзей */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {loadingFriends ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 rounded-full"></div>
              </div>
              <p className="mt-6 text-gray-700 text-xl font-bold">Загрузка друзей...</p>
            </div>
          ) : friendsList.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  Друзья ({friendsList.length})
                </span>
              </div>
              
              <div className="grid gap-4 md:gap-6">
                {friendsList.map((friendship: any, index: number) => {
                  const friend = friendship.friend;
                  if (!friend) return null;

                  const friendUser: User = {
                    id: friend.id,
                    username: friend.username,
                    display_name: friend.display_name,
                    first_name: friend.first_name,
                    last_name: friend.last_name,
                    avatar_url: friend.avatar_url,
                    bio: friend.bio,
                    status_level: friend.status_level || 1,
                    reputation_score: friend.reputation_score || 0,
                  };

                  return (
                    <div
                      key={friendship.id}
                      className="group bg-white rounded-2xl border-2 border-gray-100 p-6 md:p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                        {/* Аватар */}
                        <Link href={`/users/${friendUser.username || friendUser.id}`} className="flex-shrink-0">
                          {friendUser.avatar_url ? (
                            <Image
                              src={friendUser.avatar_url}
                              alt={getUserName(friendUser)}
                              width={80}
                              height={80}
                              className="rounded-2xl object-cover border-2 border-blue-100 group-hover:border-blue-300 transition-colors"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-black border-2 border-blue-100 group-hover:border-blue-300 transition-colors">
                              {getInitials(friendUser)}
                            </div>
                          )}
                        </Link>

                        {/* Информация */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/users/${friendUser.username || friendUser.id}`}>
                            <h3 className="text-2xl md:text-3xl font-black text-gray-900 hover:text-blue-600 transition-colors mb-2">
                              {getUserName(friendUser)}
                            </h3>
                          </Link>
                          
                          {friendUser.username && (
                            <p className="text-base md:text-lg text-gray-500 font-medium mb-3">
                              @{friendUser.username}
                            </p>
                          )}
                          
                          {friendUser.bio && (
                            <p className="text-base md:text-lg text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                              {friendUser.bio}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-base md:text-lg">
                            <div className="flex items-center gap-2 text-blue-600 font-bold">
                              <Star className="w-5 h-5 fill-current" />
                              <span>{friendUser.reputation_score || 0} опыта</span>
                            </div>
                            {friendUser.status_level > 0 && (
                              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm">
                                Уровень {friendUser.status_level}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Действия */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                          <button
                            onClick={() => handleRemoveFriend(friendUser.id)}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 hover:shadow-lg hover:scale-105 text-base font-bold flex items-center justify-center gap-2"
                          >
                            <UserX className="w-5 h-5" />
                            Удалить из друзей
                          </button>
                          <Link
                            href={`/messenger?user=${friendUser.id}`}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 text-base font-bold flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            Написать
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Пока нет друзей
              </h2>
              <p className="text-gray-600 text-xl max-w-md mx-auto font-medium mb-8">
                Найдите пользователей и добавьте их в друзья
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-bold text-base"
              >
                <Search className="w-5 h-5" />
                Найти пользователей
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
