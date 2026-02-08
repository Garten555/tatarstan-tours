'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Calendar, Shield, Upload, Loader2, CreditCard, Trash2, Star, Edit2, Eye, Settings, CheckCircle2, BookOpen, Ban, CheckCircle, X } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import UserBookings from './UserBookings';
import ImageViewerModal from '@/components/common/ImageViewerModal';

interface ProfileContentProps {
  profile: any;
  user: SupabaseUser;
  isViewMode?: boolean; // Режим просмотра (для админов, просматривающих чужие профили)
}

export default function ProfileContent({ profile, user, isViewMode = false }: ProfileContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  // В режиме просмотра используем только данные из profile, иначе из profile или user_metadata
  const [avatarUrl, setAvatarUrl] = useState(
    isViewMode 
      ? profile?.avatar_url || null
      : profile?.avatar_url || user.user_metadata?.avatar_url
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedCards, setSavedCards] = useState<Array<{
    id: string;
    last_four_digits: string;
    card_type: string;
    cardholder_name?: string;
    is_default: boolean;
  }>>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [stats, setStats] = useState({
    activeBookings: 0,
    completedTours: 0,
    totalSpent: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banReasonType, setBanReasonType] = useState<string>('custom');
  const [banPermanent, setBanPermanent] = useState(false);
  const [banDurationDays, setBanDurationDays] = useState(0);
  const [banDurationHours, setBanDurationHours] = useState(0);
  const [banning, setBanning] = useState(false);
  const [banMessage, setBanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Получаем данные из profile или user_metadata (fallback)
  // В режиме просмотра используем только данные из profile
  const firstName = isViewMode 
    ? (profile?.first_name || 'Имя')
    : (profile?.first_name || user.user_metadata?.first_name || 'Имя');
  const lastName = isViewMode
    ? (profile?.last_name || 'Фамилия')
    : (profile?.last_name || user.user_metadata?.last_name || 'Фамилия');
  const middleName = isViewMode
    ? (profile?.middle_name || '')
    : (profile?.middle_name || user.user_metadata?.middle_name || '');
  // Email берем из profile, если это режим просмотра, иначе из user
  const displayEmail = isViewMode 
    ? (profile?.email || '')
    : (user.email || '');

  // Функция для загрузки аватара
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Валидация типа файла
    if (!file.type.startsWith('image/')) {
      setUploadError('Файл должен быть изображением');
      return;
    }

    // Валидация размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Файл слишком большой. Максимум 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Не удалось загрузить аватар');
        }
        throw new Error('Не удалось загрузить аватар');
      }

      const contentType = response.headers.get('content-type');
      let data: { url: string } | null = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        // Обновляем аватар в состоянии
        if (data) {
          setAvatarUrl(data.url);
          setUploadSuccess(true);
        }
      } else {
        throw new Error('Неверный формат ответа');
      }
      
      // Очищаем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Отправляем событие для обновления UserMenu
      if (data) {
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { url: data.url } }));
      }

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      setUploadError(error instanceof Error ? error.message : 'Не удалось загрузить аватар');
    } finally {
      setIsUploading(false);
    }
  };

  // Открытие диалога выбора файла
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Открытие просмотрщика аватара
  const handleAvatarView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (avatarUrl) {
      setAvatarViewerOpen(true);
    }
  };

  // Обновляем аватар при изменении profile
  useEffect(() => {
    if (isViewMode) {
      // В режиме просмотра используем только profile
      setAvatarUrl(profile?.avatar_url || null);
    } else {
      // В своем профиле используем profile или user_metadata
      setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || null);
    }
  }, [isViewMode, profile?.avatar_url, user.user_metadata?.avatar_url]);

  // Загрузка сохраненных карт, статистики и отзывов параллельно (оптимизация производительности)
  useEffect(() => {
    const loadData = async () => {
      setLoadingCards(true);
      setLoadingStats(true);
      setLoadingReviews(true);
      
      try {
        // Загружаем карты, бронирования и отзывы параллельно для ускорения
        const [cardsResponse, bookingsResponse, reviewsResponse] = await Promise.all([
          fetch('/api/user/cards').catch(() => ({ ok: false })),
          fetch('/api/user/bookings').catch(() => ({ ok: false })),
          fetch('/api/user/reviews').catch(() => ({ ok: false }))
        ]);
        
        // Обрабатываем карты
        if (cardsResponse.ok && 'headers' in cardsResponse) {
          try {
            const contentType = cardsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const cardsData = await cardsResponse.json();
              if (cardsData.cards) {
                setSavedCards(cardsData.cards);
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга карт:', error);
          }
        }
        
        // Обрабатываем статистику
        if (bookingsResponse.ok && 'headers' in bookingsResponse) {
          try {
            const contentType = bookingsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const bookingsData = await bookingsResponse.json();
              const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);
              
              if (Array.isArray(bookings)) {
                const activeBookings = bookings.filter(
                  (b: any) => b.status === 'pending' || b.status === 'confirmed'
                ).length;
                
                const completedTours = bookings.filter(
                  (b: any) => b.status === 'completed'
                ).length;
                
                const totalSpent = bookings
                  .filter((b: any) => b.payment_status === 'paid')
                  .reduce((sum: number, b: any) => {
                    const price = parseFloat(b.total_price?.toString() || '0');
                    return sum + price;
                  }, 0);
                
                setStats({
                  activeBookings,
                  completedTours,
                  totalSpent,
                });
              } else {
                setStats({
                  activeBookings: 0,
                  completedTours: 0,
                  totalSpent: 0,
                });
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга бронирований:', error);
            setStats({
              activeBookings: 0,
              completedTours: 0,
              totalSpent: 0,
            });
          }
        } else {
          setStats({
            activeBookings: 0,
            completedTours: 0,
            totalSpent: 0,
          });
        }

        // Обрабатываем отзывы
        if (reviewsResponse.ok && 'headers' in reviewsResponse) {
          try {
            const contentType = reviewsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const reviewsData = await reviewsResponse.json();
              if (reviewsData.reviews) {
                setReviews(reviewsData.reviews);
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга отзывов:', error);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setStats({
          activeBookings: 0,
          completedTours: 0,
          totalSpent: 0,
        });
      } finally {
        setLoadingCards(false);
        setLoadingStats(false);
        setLoadingReviews(false);
      }
    };
    
    loadData();
  }, []);

  // Удаление карты
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Удалить эту карту?')) return;

    try {
      const response = await fetch(`/api/user/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedCards(prev => prev.filter(card => card.id !== cardId));
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          alert(data.error || 'Не удалось удалить карту');
        } else {
          alert('Не удалось удалить карту');
        }
      }
    } catch (error) {
      console.error('Ошибка удаления карты:', error);
      alert('Произошла ошибка при удалении карты');
    }
  };

  // Установка карты по умолчанию
  const handleSetDefaultCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/user/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_default: true }),
      });

      if (response.ok) {
        setSavedCards(prev => 
          prev.map(card => ({
            ...card,
            is_default: card.id === cardId,
          }))
        );
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          alert(data.error || 'Не удалось установить карту по умолчанию');
        } else {
          alert('Не удалось установить карту по умолчанию');
        }
      }
    } catch (error) {
      console.error('Ошибка установки карты по умолчанию:', error);
      alert('Произошла ошибка');
    }
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      user: 'Пользователь',
      tour_admin: 'Администратор туров',
      support_admin: 'Администратор поддержки',
      super_admin: 'Супер администратор',
    };
    return roles[role] || role;
  };

  // Определяем, является ли пользователь админом
  const isAdmin = profile?.role && ['tour_admin', 'support_admin', 'super_admin'].includes(profile.role);
  const isSuperAdmin = profile?.role === 'super_admin';
  const [deletingAllBookings, setDeletingAllBookings] = useState(false);

  // Функции для бана/разбана
  const handleBan = async () => {
    if (!profile?.id) return;
    
    setBanning(true);
    setBanMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${profile.id}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'ban',
          reason: banReason.trim() || null,
          permanent: banPermanent,
          duration_hours: banDurationHours,
          duration_days: banDurationDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось забанить пользователя');
      }

      setBanMessage({ type: 'success', text: 'Пользователь успешно забанен!' });
      setBanModalOpen(false);
      setBanReason('');
      setBanPermanent(false);
      setBanDurationDays(0);
      setBanDurationHours(0);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setBanMessage({ type: 'error', text: error.message });
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async () => {
    if (!profile?.id) return;
    
    setBanning(true);
    setBanMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${profile.id}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unban',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось разбанить пользователя');
      }

      setBanMessage({ type: 'success', text: 'Пользователь успешно разбанен!' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setBanMessage({ type: 'error', text: error.message });
    } finally {
      setBanning(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-gray-100">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900">
          {isViewMode ? `Профиль: ${firstName} ${lastName}` : 'Мой профиль'}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {isViewMode && (
            <>
              {/* Кнопка туристического паспорта */}
              {profile?.username || profile?.id ? (
                <Link
                  href={`/users/${profile.username || profile.id}#passport`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl font-black text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Туристический паспорт</span>
                </Link>
              ) : null}
              {/* Кнопка бана/разбана - только если это не свой профиль */}
              {profile?.id && profile.id !== user.id && (
                <button
                  onClick={() => {
                    if (profile?.is_banned) {
                      handleUnban();
                    } else {
                      setBanModalOpen(true);
                    }
                  }}
                  disabled={banning}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ${
                    profile?.is_banned
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white drop-shadow-sm'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white drop-shadow-sm'
                  }`}
                >
                  {banning ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : profile?.is_banned ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Разбанить</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-5 h-5" />
                      <span>Забанить</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
          {!isViewMode && (
            <Link
              href="/profile/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </Link>
          )}
        </div>
      </div>

      {/* Сообщение о бане/разбане */}
      {banMessage && (
        <div className={`p-4 rounded-xl font-bold text-center ${
          banMessage.type === 'success' 
            ? 'bg-green-100 text-green-800 border-2 border-green-300' 
            : 'bg-red-100 text-red-800 border-2 border-red-300'
        }`}>
          {banMessage.text}
        </div>
      )}

      {/* Информация о бане (если пользователь забанен) */}
      {isViewMode && profile?.is_banned && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Ban className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-black text-red-900">Пользователь забанен</h3>
          </div>
          {profile.ban_reason && (
            <p className="text-base font-semibold text-red-800 mb-2">
              <strong>Причина:</strong> {profile.ban_reason}
            </p>
          )}
          {profile.banned_at && (
            <p className="text-sm font-medium text-red-700">
              <strong>Забанен:</strong> {new Date(profile.banned_at).toLocaleString('ru-RU')}
            </p>
          )}
          {profile.ban_until && (
            <p className="text-sm font-medium text-red-700">
              <strong>Бан до:</strong> {new Date(profile.ban_until).toLocaleString('ru-RU')}
            </p>
          )}
          {!profile.ban_until && (
            <p className="text-sm font-medium text-red-700">
              <strong>Постоянный бан</strong>
            </p>
          )}
        </div>
      )}

      {/* Основная информация */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-xl text-white">
              <User className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            Личные данные
          </h2>
          {!isViewMode && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <Edit2 className="w-5 h-5" />
              {isEditing ? 'Отмена' : 'Редактировать'}
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Аватар */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-8 p-6 md:p-8 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100">
            <div className="relative group">
              {avatarUrl ? (
                <button
                  onClick={handleAvatarView}
                  className="relative block cursor-pointer hover:scale-105 transition-transform duration-200"
                  title="Просмотреть фото"
                >
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-emerald-300 shadow-xl"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black shadow-xl border-4 border-emerald-200">
                  {firstName[0]}{lastName[0]}
                </div>
              )}
              {/* Кнопка загрузки аватара */}
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-12 h-12 md:w-14 md:h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white"
                title="Загрузить аватар"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </button>
              {/* Скрытый input для выбора файла */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900">
                  {firstName} {middleName} {lastName}
                </h3>
                {isAdmin && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{getRoleName(profile?.role)}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-700 flex items-center gap-2 text-lg md:text-xl mb-4 font-medium">
                <Mail className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                {displayEmail || ''}
              </p>
              {uploadError && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-red-600 text-base font-bold">{uploadError}</p>
                </div>
              )}
              {uploadSuccess && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                  <p className="text-emerald-600 text-base font-black">✓ Аватар успешно загружен!</p>
                </div>
              )}
            </div>
          </div>

          {/* Имя */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <User className="w-5 h-5 text-emerald-600" />
              Имя
            </label>
            <input
              type="text"
              value={firstName}
              disabled={!isEditing || isViewMode}
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-600 font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Фамилия */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <User className="w-5 h-5 text-emerald-600" />
              Фамилия
            </label>
            <input
              type="text"
              value={lastName}
              disabled={!isEditing || isViewMode}
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-600 font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Отчество */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <User className="w-5 h-5 text-emerald-600" />
              Отчество
            </label>
            <input
              type="text"
              value={middleName}
              disabled={!isEditing || isViewMode}
              placeholder="Не указано"
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-600 font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Email */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <Mail className="w-5 h-5 text-emerald-600" />
              Email
            </label>
            <input
              type="email"
              value={displayEmail || ''}
              disabled
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-medium text-base"
            />
          </div>

          {/* Телефон */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <Phone className="w-5 h-5 text-emerald-600" />
              Телефон
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              disabled={!isEditing || isViewMode}
              placeholder="+7 (900) 123-45-67"
              className="w-full px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-600 font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Роль */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <Shield className="w-5 h-5 text-emerald-600" />
              Роль
            </label>
            <div className={`px-4 py-3 md:py-4 border-2 rounded-xl ${
              isAdmin 
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300' 
                : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                )}
                <span className={`font-bold text-base md:text-lg ${
                  isAdmin ? 'text-purple-700' : 'text-gray-900'
                }`}>
                  {getRoleName(profile?.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Дата регистрации */}
          <div className="bg-gray-50 rounded-xl p-5 md:p-6 border-2 border-gray-100">
            <label className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 mb-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Дата регистрации
            </label>
            <div className="px-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl bg-white">
              <span className="text-gray-900 font-bold text-base md:text-lg">
                {new Date(profile?.created_at).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        {isEditing && (
          <div className="mt-8 flex gap-4 pt-6 border-t-2 border-gray-100">
            <button className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:scale-105">
              Сохранить изменения
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-8 py-4 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-base transition-all duration-200"
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {loadingStats ? (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-600 mb-3 animate-pulse">...</div>
          ) : (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-3">
              {stats.activeBookings || 0}
            </div>
          )}
          <div className="text-gray-700 font-bold text-lg md:text-xl">Активных бронирований</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {loadingStats ? (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-600 mb-3 animate-pulse">...</div>
          ) : (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-3">
              {stats.completedTours || 0}
            </div>
          )}
          <div className="text-gray-700 font-bold text-lg md:text-xl">Завершённых туров</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {loadingStats ? (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-600 mb-3 animate-pulse">...</div>
          ) : (
            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-3">
              {(stats.totalSpent || 0).toLocaleString('ru-RU')} ₽
            </div>
          )}
          <div className="text-gray-700 font-bold text-lg md:text-xl">Потрачено на туры</div>
        </div>
      </div>

      {/* Кнопка удаления всех бронирований (только для супер админа) */}
      {isSuperAdmin && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-black text-red-900 mb-3 flex items-center gap-2">
                <Trash2 className="w-6 h-6" />
                Удаление всех бронирований
              </h3>
              <p className="text-base md:text-lg text-red-700 font-medium">
                Внимание: это действие удалит все ваши бронирования, участников бронирований, отзывы и удалит вас из комнат туров. Действие необратимо.
              </p>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Вы уверены, что хотите удалить ВСЕ свои бронирования? Это действие необратимо!')) {
                  return;
                }
                if (!confirm('Это удалит все бронирования, участников, отзывы и удалит вас из комнат туров. Продолжить?')) {
                  return;
                }
                
                setDeletingAllBookings(true);
                try {
                  const response = await fetch('/api/user/bookings/delete-all', {
                    method: 'DELETE',
                  });
                  
                  if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                      const data = await response.json();
                      alert(`Успешно удалено ${data.deleted} бронирований`);
                      // Перезагружаем страницу для обновления данных
                      window.location.reload();
                    } else {
                      alert('Бронирования удалены');
                      window.location.reload();
                    }
                  } else {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                      const data = await response.json();
                      alert(data.error || 'Не удалось удалить бронирования');
                    } else {
                      alert('Не удалось удалить бронирования');
                    }
                  }
                } catch (error) {
                  console.error('Ошибка удаления бронирований:', error);
                  alert('Произошла ошибка при удалении бронирований');
                } finally {
                  setDeletingAllBookings(false);
                }
              }}
              disabled={deletingAllBookings}
              className="px-6 py-3 md:py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-base transition-all duration-300 hover:shadow-lg"
            >
              {deletingAllBookings ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Удаление...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  <span>Удалить все бронирования</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Мои бронирования */}
      <UserBookings isViewMode={isViewMode} />

      {/* Сохраненные карты - только в своем профиле */}
      {!isViewMode && (
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <div className="p-3 bg-emerald-600 rounded-xl text-white">
            <CreditCard className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          Сохраненные карты
        </h2>
        
        {loadingCards ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
          </div>
        ) : savedCards.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <p className="text-xl md:text-2xl font-bold text-gray-700 mb-2">У вас нет сохраненных карт</p>
            <p className="text-lg text-gray-600 font-medium">
              Карты будут сохранены при бронировании тура
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-5 md:p-6 border-2 border-gray-100 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`w-14 h-10 md:w-16 md:h-12 rounded-lg ${
                    card.card_type === 'visa' ? 'bg-blue-600' :
                    card.card_type === 'mastercard' ? 'bg-red-600' :
                    card.card_type === 'mir' ? 'bg-emerald-600' :
                    'bg-gray-400'
                  } flex items-center justify-center text-white text-sm md:text-base font-black`}>
                    {card.card_type.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg md:text-xl text-gray-900">
                      •••• {card.last_four_digits}
                    </div>
                    {card.cardholder_name && (
                      <div className="text-base text-gray-600 font-medium">{card.cardholder_name}</div>
                    )}
                  </div>
                  {card.is_default && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Star className="w-5 h-5 fill-current" />
                      <span className="text-sm font-bold">По умолчанию</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!card.is_default && (
                    <button
                      onClick={() => handleSetDefaultCard(card.id)}
                      className="p-2.5 text-gray-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                      title="Установить по умолчанию"
                    >
                      <Star className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    title="Удалить карту"
                  >
                    <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Мои отзывы */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 md:p-8">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <div className="p-3 bg-emerald-600 rounded-xl text-white">
            <Star className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          {isViewMode ? 'Отзывы' : 'Мои отзывы'}
        </h2>
        
        {loadingReviews ? (
          <div className="text-center py-16">
            <div className="relative inline-block">
              <Loader2 className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-200 rounded-full"></div>
            </div>
            <p className="text-xl font-bold text-gray-700">Загрузка отзывов...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <p className="text-xl md:text-2xl font-bold text-gray-700 mb-2">
              {isViewMode ? 'Нет отзывов' : 'У вас пока нет отзывов'}
            </p>
            {!isViewMode && (
              <p className="text-lg text-gray-600 font-medium">
                Отзывы появятся после завершения туров
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-2 border-gray-100 rounded-2xl p-6 md:p-8 bg-white hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {review.tour && (
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3">
                        {review.tour.title}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 text-base text-gray-600 mb-3 font-medium">
                      <Calendar className="w-5 h-5" />
                      <span>
                        {new Date(review.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const isActive = review.rating >= value;
                      return (
                        <Star
                          key={value}
                          className={`w-5 h-5 md:w-6 md:h-6 ${
                            isActive
                              ? review.rating >= 4.5
                                ? 'text-emerald-600'
                                : review.rating >= 3.5
                                ? 'text-lime-600'
                                : review.rating >= 2.5
                                ? 'text-amber-500'
                                : 'text-rose-500'
                              : 'text-gray-200'
                          }`}
                          fill={isActive ? 'currentColor' : 'none'}
                        />
                      );
                    })}
                    <span className="ml-2 text-xl md:text-2xl font-black text-gray-900">{review.rating}</span>
                  </div>
                </div>
                
                {review.text && (
                  <p className="text-gray-700 whitespace-pre-line break-words text-base md:text-lg leading-relaxed mb-4">
                    {review.text}
                  </p>
                )}

                {review.tour && (
                  <a
                    href={`/tours/${review.tour.slug}`}
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-base transition-colors"
                  >
                    Посмотреть тур →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Просмотрщик аватара */}
      {avatarUrl && (
        <ImageViewerModal
          isOpen={avatarViewerOpen}
          images={[avatarUrl]}
          title="Аватар профиля"
          initialIndex={0}
          onClose={() => setAvatarViewerOpen(false)}
        />
      )}

      {/* Модальное окно для бана */}
      {banModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                <Ban className="w-8 h-8 text-red-600" />
                Забанить пользователя
              </h2>
              <button
                onClick={() => {
                  setBanModalOpen(false);
                  setBanReason('');
                  setBanReasonType('custom');
                  setBanPermanent(false);
                  setBanDurationDays(0);
                  setBanDurationHours(0);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Предупреждение при бане админа */}
              {profile?.role && ['tour_admin', 'support_admin'].includes(profile.role) && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-black text-yellow-900 mb-1">
                        Внимание: Бан администратора
                      </h3>
                      <p className="text-sm font-semibold text-yellow-800">
                        При бане этого пользователя он будет автоматически снят с роли администратора и забанен. Это действие необратимо до разбана.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Причина бана */}
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Причина бана (необязательно)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Укажите причину бана..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base resize-none"
                  rows={4}
                />
              </div>

              {/* Тип бана */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banPermanent}
                    onChange={(e) => setBanPermanent(e.target.checked)}
                    className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-base font-bold text-gray-900">Постоянный бан</span>
                </label>
              </div>

              {/* Длительность бана (если не постоянный) */}
              {!banPermanent && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">
                      Дней
                    </label>
                    <input
                      type="number"
                      value={banDurationDays}
                      onChange={(e) => setBanDurationDays(Math.max(0, parseInt(e.target.value) || 0))}
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">
                      Часов
                    </label>
                    <input
                      type="number"
                      value={banDurationHours}
                      onChange={(e) => setBanDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                      min="0"
                      max="23"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base"
                    />
                  </div>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={handleBan}
                  disabled={banning}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {banning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Бан...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-5 h-5" />
                      <span>Забанить</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setBanModalOpen(false);
                    setBanReason('');
                    setBanReasonType('custom');
                    setBanPermanent(false);
                    setBanDurationDays(0);
                    setBanDurationHours(0);
                  }}
                  disabled={banning}
                  className="px-6 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

