// Страница настроек профиля (username, публичный профиль)
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  User, 
  Globe, 
  Lock, 
  Save, 
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';
import TwoFactorSettings from '@/components/auth/TwoFactorSettings';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [travelers, setTravelers] = useState<any[]>([]);
  const [loadingTravelers, setLoadingTravelers] = useState(false);
  const [newTraveler, setNewTraveler] = useState({
    full_name: '',
    relationship: '',
    is_child: false,
    email: '',
    phone: '',
  });

  // Форма
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  
  // Настройки приватности
  const [privacySettings, setPrivacySettings] = useState({
    who_can_message: 'everyone' as 'everyone' | 'friends' | 'nobody',
    who_can_follow: 'everyone' as 'everyone' | 'friends' | 'nobody',
    who_can_add_friend: 'everyone' as 'everyone' | 'friends' | 'nobody',
    who_can_view_gallery: 'everyone' as 'everyone' | 'followers' | 'friends' | 'nobody',
    auto_accept_friends: false,
    show_online_status: true,
    show_last_seen: true,
  });
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  
  // Валидация
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth/login?redirect=/profile/settings');
        return;
      }
      setUser(currentUser);

      // Загружаем профиль
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setUsername(data.profile.username || '');
        setBio(data.profile.bio || '');
        setPublicProfileEnabled(data.profile.public_profile_enabled || false);
      }
      
      setLoadingTravelers(true);
      try {
        const travelersResponse = await fetch('/api/profile/travelers');
        const travelersData = await travelersResponse.json();
        if (travelersResponse.ok && travelersData.travelers) {
          setTravelers(travelersData.travelers);
        }
      } catch (error) {
        console.error('Ошибка загрузки участников:', error);
      } finally {
        setLoadingTravelers(false);
      }
      
      // Загружаем настройки приватности
      setLoadingPrivacy(true);
      try {
        const privacyResponse = await fetch('/api/users/privacy');
        const privacyData = await privacyResponse.json();
        if (privacyResponse.ok && privacyData.privacy) {
          setPrivacySettings({
            who_can_message: privacyData.privacy.who_can_message || 'everyone',
            who_can_follow: privacyData.privacy.who_can_follow || 'everyone',
            who_can_add_friend: privacyData.privacy.who_can_add_friend || 'everyone',
            who_can_view_gallery: privacyData.privacy.who_can_view_gallery || 'everyone',
            auto_accept_friends: privacyData.privacy.auto_accept_friends || false,
            show_online_status: privacyData.privacy.show_online_status !== false,
            show_last_seen: privacyData.privacy.show_last_seen !== false,
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки настроек приватности:', error);
      } finally {
        setLoadingPrivacy(false);
      }
      
      setLoading(false);
    };
    loadProfile();

    // Cleanup timeout при размонтировании
    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [router, supabase]);

  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Валидация формата username
  const validateUsernameFormat = (value: string): string | null => {
    if (!value) {
      return null; // Пустое значение допустимо
    }

    if (value.length < 3) {
      return 'Username должен содержать минимум 3 символа';
    }

    if (value.length > 30) {
      return 'Username не может быть длиннее 30 символов';
    }

    // Только латиница, цифры, дефисы и подчеркивания
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(value.toLowerCase())) {
      return 'Используйте только латиницу, цифры, дефисы (-) и подчеркивания (_)';
    }

    // Не может начинаться или заканчиваться дефисом или подчеркиванием
    if (/^[-_]|[-_]$/.test(value)) {
      return 'Username не может начинаться или заканчиваться дефисом или подчеркиванием';
    }

    // Не может содержать два подряд идущих дефиса или подчеркивания
    if (/[-_]{2,}/.test(value)) {
      return 'Username не может содержать два подряд идущих дефиса или подчеркивания';
    }

    // Зарезервированные слова
    const reservedWords = ['admin', 'administrator', 'moderator', 'support', 'api', 'www', 'mail', 'ftp', 'root', 'system', 'test', 'null', 'undefined', 'true', 'false'];
    if (reservedWords.includes(value.toLowerCase())) {
      return 'Этот username зарезервирован и недоступен';
    }

    return null; // Валидация пройдена
  };

  // Проверка доступности username
  const checkUsername = async (value: string) => {
    // Сначала проверяем формат
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameError(formatError);
      setUsernameAvailable(false);
      return;
    }

    setUsernameError(null);
    setCheckingUsername(true);
    
    try {
      const response = await fetch(`/api/profile/check-username?username=${encodeURIComponent(value)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка проверки username');
      }

      if (data.available) {
        setUsernameAvailable(true);
        setUsernameError(null);
      } else {
        setUsernameAvailable(false);
        setUsernameError(data.reason || 'Этот username уже занят');
      }
    } catch (error: any) {
      console.error('Ошибка проверки username:', error);
      setUsernameAvailable(null);
      setUsernameError(error.message || 'Ошибка проверки username');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Очищаем предыдущий timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    // Очищаем значение от недопустимых символов
    let cleanValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    
    // Убираем дефисы и подчеркивания в начале и конце
    cleanValue = cleanValue.replace(/^[-_]+|[-_]+$/g, '');
    
    // Убираем двойные дефисы и подчеркивания
    cleanValue = cleanValue.replace(/[-_]{2,}/g, (match) => match[0]);
    
    setUsername(cleanValue);
    
    // Сбрасываем состояние проверки
    setUsernameAvailable(null);
    setUsernameError(null);

    // Если значение изменилось и не пустое - проверяем с дебаунсом
    if (cleanValue && cleanValue !== profile?.username) {
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsername(cleanValue);
      }, 500);
    } else if (cleanValue === profile?.username) {
      // Если вернулись к исходному username - доступен
      setUsernameAvailable(true);
      setUsernameError(null);
    }
  };

  const handleSave = async () => {
    // Валидация
    if (publicProfileEnabled && !username) {
      toast.error('Для публичного профиля необходимо указать username');
      return;
    }

    if (username) {
      // Проверяем формат
      const formatError = validateUsernameFormat(username);
      if (formatError) {
        toast.error(formatError);
        setUsernameError(formatError);
        return;
      }

      // Проверяем доступность
      if (usernameAvailable === false) {
        toast.error(usernameError || 'Этот username уже занят');
        return;
      }

      // Если еще не проверено - проверяем
      if (usernameAvailable === null && username !== profile?.username) {
        await checkUsername(username);
        // Ждем результат проверки
        await new Promise(resolve => setTimeout(resolve, 100));
        if (usernameAvailable === false) {
          toast.error(usernameError || 'Этот username уже занят');
          return;
        }
      }
    }

    if (bio && bio.length > 500) {
      toast.error('Описание не может быть длиннее 500 символов');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username || null,
          bio: bio || null,
          public_profile_enabled: publicProfileEnabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить настройки');
      }

      toast.success('Настройки сохранены!');
      
      // Обновляем профиль
      setProfile(data.profile);
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error(error.message || 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTraveler = async () => {
    if (!newTraveler.full_name || newTraveler.full_name.trim().length < 2) {
      toast.error('Укажите ФИО участника');
      return;
    }

    try {
      const response = await fetch('/api/profile/travelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newTraveler.full_name,
          relationship: newTraveler.relationship || null,
          is_child: newTraveler.is_child,
          email: newTraveler.email || null,
          phone: newTraveler.phone || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить участника');
      }
      setTravelers((prev) => [data.traveler, ...prev]);
      setNewTraveler({ full_name: '', relationship: '', is_child: false, email: '', phone: '' });
      toast.success('Участник добавлен');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось добавить участника');
    }
  };

  const handleDeleteTraveler = async (travelerId: string) => {
    if (!confirm('Удалить участника?')) return;
    try {
      const response = await fetch(`/api/profile/travelers/${travelerId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить участника');
      }
      setTravelers((prev) => prev.filter((t) => t.id !== travelerId));
      toast.success('Участник удален');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить участника');
    }
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      const response = await fetch('/api/users/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить настройки приватности');
      }

      toast.success('Настройки приватности сохранены!');
    } catch (error: any) {
      console.error('Ошибка сохранения настроек приватности:', error);
      toast.error(error.message || 'Не удалось сохранить настройки приватности');
    } finally {
      setSavingPrivacy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Функция форматирования телефона
  const formatPhone = (value: string): string => {
    let cleaned = value.replace(/[^\d+]/g, '');
    
    if (!cleaned.startsWith('+7') && !cleaned.startsWith('7') && !cleaned.startsWith('8')) {
      if (cleaned.length > 0 && !cleaned.startsWith('+')) {
        cleaned = '+7' + cleaned.replace(/^\+?/, '');
      } else if (cleaned.length === 0) {
        return '';
      }
    }
    
    if (cleaned.startsWith('8')) {
      cleaned = '+7' + cleaned.slice(1);
    } else if (cleaned.startsWith('7')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+7')) {
      cleaned = '+7' + cleaned.replace(/^\+?/, '');
    }
    
    cleaned = cleaned.slice(0, 13);
    
    if (cleaned.length <= 2) {
      return cleaned;
    }
    
    const digits = cleaned.slice(2).replace(/\D/g, '');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-8 lg:py-12 relative">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-8">Настройки профиля</h1>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100/50 p-6 lg:p-8 space-y-8 hover:shadow-2xl transition-shadow duration-300">
          {/* Публичный профиль */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-6 h-6 text-emerald-600" />
              Публичный профиль
            </h2>
            <p className="text-gray-600 mb-4">
              Включите публичный профиль, чтобы другие пользователи могли видеть ваши дневники и достижения.
            </p>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={publicProfileEnabled}
                onChange={(e) => {
                  setPublicProfileEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setUsernameAvailable(null);
                  }
                }}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-gray-700 font-medium">
                Включить публичный профиль
              </span>
            </label>

            {publicProfileEnabled && username && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900 mb-2">Ваша уникальная ссылка:</p>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="flex-1 font-mono text-sm bg-white px-3 py-2 rounded border border-emerald-300 text-emerald-900 break-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/users/${escapeHtml(username)}` : `/users/${escapeHtml(username)}`}
                      </code>
                      <button
                        onClick={async () => {
                          if (typeof window === 'undefined') return;
                          
                          const fullUrl = `${window.location.origin}/users/${username}`;
                          
                          try {
                            // Пробуем использовать современный API
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              await navigator.clipboard.writeText(fullUrl);
                              toast.success('Ссылка скопирована в буфер обмена!');
                            } else {
                              // Fallback для старых браузеров
                              const textArea = document.createElement('textarea');
                              textArea.value = fullUrl;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                              toast.success('Ссылка скопирована в буфер обмена!');
                            }
                          } catch (error) {
                            console.error('Ошибка копирования:', error);
                            toast.error('Не удалось скопировать ссылку');
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Копировать
                      </button>
                    </div>
                    <Link
                      href={`/users/${username}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      Открыть публичный профиль →
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {publicProfileEnabled && !username && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Укажите username, чтобы получить уникальную ссылку</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Username (никнейм) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onBlur={() => {
                  if (username && username !== profile?.username) {
                    // Очищаем timeout при blur
                    if (usernameTimeoutRef.current) {
                      clearTimeout(usernameTimeoutRef.current);
                    }
                    checkUsername(username);
                  }
                }}
                placeholder="traveler_kazan"
                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 ${
                  usernameError || usernameAvailable === false
                    ? 'border-red-300 focus:ring-red-500'
                    : usernameAvailable === true
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-emerald-500'
                }`}
                maxLength={30}
                disabled={checkingUsername}
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}
              {!checkingUsername && username && usernameAvailable !== null && !usernameError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameAvailable ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {username.length}/30. Только латиница, цифры, дефисы (-) и подчеркивания (_). Минимум 3 символа. Это будет ваше отображаемое имя в публичном профиле.
            </p>
            {usernameError && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                {usernameError}
              </p>
            )}
            {!usernameError && usernameAvailable === false && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Этот username уже занят
              </p>
            )}
            {!usernameError && usernameAvailable === true && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Username доступен
              </p>
            )}
            {publicProfileEnabled && !username && (
              <p className="text-sm text-amber-600 mt-1">Для публичного профиля необходимо указать username</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание профиля
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {bio.length}/500
            </p>
          </div>

          {/* Участники для бронирований */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Участники для бронирований
            </h2>
            <p className="text-gray-600 mb-4">
              Сохраните данные членов семьи или друзей, чтобы не вводить их каждый раз при бронировании.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ФИО *</label>
                <input
                  type="text"
                  value={newTraveler.full_name}
                  onChange={(e) => setNewTraveler((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Иванов Иван"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Кто это</label>
                <select
                  value={newTraveler.relationship}
                  onChange={(e) => setNewTraveler((prev) => ({ ...prev, relationship: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Не указано</option>
                  <option value="супруг/супруга">Супруг/супруга</option>
                  <option value="ребенок">Ребенок</option>
                  <option value="родитель">Родитель</option>
                  <option value="друг">Друг</option>
                  <option value="другое">Другое</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newTraveler.is_child}
                  onChange={(e) => setNewTraveler((prev) => ({ ...prev, is_child: e.target.checked }))}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Ребенок</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newTraveler.email}
                  onChange={(e) => setNewTraveler((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                <input
                  type="tel"
                  value={newTraveler.phone}
                  onChange={(e) => setNewTraveler((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="+7 900 000-00-00"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddTraveler}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Добавить участника
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loadingTravelers ? (
                <div className="text-sm text-gray-500">Загрузка...</div>
              ) : travelers.length === 0 ? (
                <div className="text-sm text-gray-500">Пока нет сохраненных участников.</div>
              ) : (
                travelers.map((traveler) => (
                  <div
                    key={traveler.id}
                    className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-xl"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{traveler.full_name}</div>
                      <div className="text-sm text-gray-600">
                        {traveler.relationship || 'Не указано'}
                        {traveler.is_child ? ' • ребенок' : ''}
                      </div>
                      {traveler.email && (
                        <div className="text-xs text-gray-500">{traveler.email}</div>
                      )}
                      {traveler.phone && (
                        <div className="text-xs text-gray-500">{traveler.phone}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTraveler(traveler.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Настройки приватности */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-emerald-600" />
              Настройки приватности
            </h2>
            <p className="text-gray-600 mb-6">
              Управляйте, кто может подписываться на вас, добавлять в друзья, просматривать вашу галерею и отправлять сообщения.
            </p>

            {loadingPrivacy ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Кто может подписаться */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может подписаться на меня
                  </label>
                  <select
                    value={privacySettings.who_can_follow}
                    onChange={(e) => setPrivacySettings((prev) => ({ ...prev, who_can_follow: e.target.value as 'everyone' | 'friends' | 'nobody' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {privacySettings.who_can_follow === 'everyone' && 'Любой пользователь может подписаться на вас'}
                    {privacySettings.who_can_follow === 'friends' && 'Только ваши друзья могут подписаться на вас'}
                    {privacySettings.who_can_follow === 'nobody' && 'Подписки отключены'}
                  </p>
                </div>

                {/* Кто может добавить в друзья */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может добавить меня в друзья
                  </label>
                  <select
                    value={privacySettings.who_can_add_friend}
                    onChange={(e) => setPrivacySettings((prev) => ({ ...prev, who_can_add_friend: e.target.value as 'everyone' | 'friends' | 'nobody' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {privacySettings.who_can_add_friend === 'everyone' && 'Любой пользователь может отправить вам запрос на дружбу'}
                    {privacySettings.who_can_add_friend === 'friends' && 'Только ваши друзья могут отправить вам запрос на дружбу'}
                    {privacySettings.who_can_add_friend === 'nobody' && 'Запросы на дружбу отключены'}
                  </p>
                </div>

                {/* Кто может просматривать галерею */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может просматривать мою галерею
                  </label>
                  <select
                    value={privacySettings.who_can_view_gallery}
                    onChange={(e) => setPrivacySettings((prev) => ({ ...prev, who_can_view_gallery: e.target.value as 'everyone' | 'followers' | 'friends' | 'nobody' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="followers">Только подписчики</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {privacySettings.who_can_view_gallery === 'everyone' && 'Любой пользователь может просматривать вашу галерею'}
                    {privacySettings.who_can_view_gallery === 'followers' && 'Только ваши подписчики могут просматривать вашу галерею'}
                    {privacySettings.who_can_view_gallery === 'friends' && 'Только ваши друзья могут просматривать вашу галерею'}
                    {privacySettings.who_can_view_gallery === 'nobody' && 'Галерея доступна только вам'}
                  </p>
                </div>

                {/* Кто может писать сообщения */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может писать мне сообщения
                  </label>
                  <select
                    value={privacySettings.who_can_message}
                    onChange={(e) => setPrivacySettings((prev) => ({ ...prev, who_can_message: e.target.value as 'everyone' | 'friends' | 'nobody' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {privacySettings.who_can_message === 'everyone' && 'Любой пользователь может отправить вам сообщение'}
                    {privacySettings.who_can_message === 'friends' && 'Только ваши друзья могут отправить вам сообщение'}
                    {privacySettings.who_can_message === 'nobody' && 'Сообщения отключены'}
                  </p>
                </div>

                {/* Автоматическое принятие друзей */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={privacySettings.auto_accept_friends}
                    onChange={(e) => setPrivacySettings((prev) => ({ ...prev, auto_accept_friends: e.target.checked }))}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-700 cursor-pointer">
                      Автоматически принимать запросы на дружбу
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Запросы на дружбу будут приниматься автоматически без вашего подтверждения
                    </p>
                  </div>
                </div>

                {/* Кнопка сохранения настроек приватности */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSavePrivacy}
                    disabled={savingPrivacy}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPrivacy ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Сохранить настройки приватности
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Двухфакторная аутентификация */}
          <div className="border-t border-gray-200 pt-6">
            <TwoFactorSettings />
          </div>

          {/* Кнопка сохранения */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || checkingUsername || (publicProfileEnabled && (!username || usernameAvailable === false))}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Сохранить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

