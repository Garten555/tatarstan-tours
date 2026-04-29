'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Users, 
  UserPlus,
  UserMinus,
  Shield,
  Lock,
  CheckCircle2,
  Upload,
  Loader2,
  X,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import { FollowButton } from './FollowButton';
import { FriendButton } from './FriendButton';
import { MessageButton } from './MessageButton';
import BanUserButton from '@/components/admin/BanUserButton';

interface ProfileHeaderProps {
  profileData: {
    id: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    status_level: number;
    reputation_score: number;
    role: string;
    is_banned: boolean | null;
    banned_at: string | null;
    ban_reason: string | null;
    ban_until: string | null;
  };
  stats: {
    blog_posts_count: number;
    achievements_count: number;
    followers_count: number;
    completed_tours_count: number;
  };
  statusLevel: {
    name: string;
    color: string;
    icon: string;
  };
  isBanned: boolean;
  isAdmin: boolean;
  isCurrentUserAdmin: boolean;
  currentUser: { id: string } | null;
  cleanUsername: string;
  privacySettings: any;
  areFriends: boolean;
  isFollowing: boolean;
  friendsList: any[];
  followersList: any[];
  followingList: any[];
  roleLabel?: string;
  profileCoverUrl?: string | null;
}

export default function ProfileHeader({
  profileData,
  stats,
  statusLevel,
  isBanned,
  isAdmin,
  isCurrentUserAdmin,
  currentUser,
  cleanUsername,
  privacySettings,
  areFriends,
  isFollowing,
  friendsList,
  followersList,
  followingList,
  roleLabel,
  profileCoverUrl,
}: ProfileHeaderProps) {
  const [coverUrl, setCoverUrl] = useState(profileCoverUrl || null);
  const [avatarUrl, setAvatarUrl] = useState(profileData.avatar_url || null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwner = Boolean(currentUser && currentUser.id === profileData.id);

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverError(null);

    if (!file.type.startsWith('image/')) {
      setCoverError('Файл шапки должен быть изображением');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setCoverError('Разрешены только JPG, PNG и WEBP');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setCoverError('Максимальный размер шапки — 8MB');
      return;
    }

    try {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/cover', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось загрузить шапку');
      }

      setCoverUrl(data.url || null);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'Ошибка загрузки шапки');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverError(null);

    if (!file.type.startsWith('image/')) {
      setCoverError('Файл аватара должен быть изображением');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setCoverError('Разрешены только JPG, PNG и WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCoverError('Максимальный размер аватара — 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось загрузить аватар');
      }

      setAvatarUrl(data.url || null);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'Ошибка загрузки аватара');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const resetEditorState = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setAvatarPreview(null);
    setCoverPreview(null);
    setAvatarFile(null);
    setCoverFile(null);
    setEditorError(null);
  };

  const onSelectFile = (event: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setEditorError('Разрешены только JPG, PNG и WEBP');
      return;
    }
    const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setEditorError(type === 'avatar' ? 'Аватар: максимум 5MB' : 'Шапка: максимум 8MB');
      return;
    }
    setEditorError(null);
    const preview = URL.createObjectURL(file);
    if (type === 'avatar') {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(preview);
      setAvatarFile(file);
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(preview);
      setCoverFile(file);
    }
  };

  const saveEditorChanges = async () => {
    if (!avatarFile && !coverFile) {
      setEditorError('Выберите аватар и/или шапку');
      return;
    }
    setEditorError(null);
    try {
      if (coverFile) {
        const fakeEvent = { target: { files: [coverFile] } } as unknown as ChangeEvent<HTMLInputElement>;
        await handleCoverUpload(fakeEvent);
      }
      if (avatarFile) {
        const fakeEvent = { target: { files: [avatarFile] } } as unknown as ChangeEvent<HTMLInputElement>;
        await handleAvatarUpload(fakeEvent);
      }
      resetEditorState();
      setIsEditorOpen(false);
    } catch {
      setEditorError('Не удалось сохранить изменения');
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      user: 'Пользователь',
      tour_admin: 'Администратор туров',
      support_admin: 'Администратор поддержки',
      super_admin: 'Супер администратор',
    };
    return roles[role] || role;
  };
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Обложка профиля */}
      <div className="relative h-52 md:h-64 border-b border-gray-200 overflow-hidden">
        {coverUrl ? (
          <>
            <Image
              src={coverUrl}
              alt="Шапка профиля"
              fill
              className="object-cover"
              unoptimized={coverUrl.includes('s3.twcstorage.ru')}
            />
            <div className="absolute inset-0 bg-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-300/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-400/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        )}

        {isOwner && (
          <div className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={() => {
                resetEditorState();
                setIsEditorOpen(true);
              }}
              disabled={isUploadingCover}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-50/95 hover:bg-emerald-100 text-emerald-950 px-3.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition-colors disabled:opacity-60"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {coverUrl ? 'Сменить шапку' : 'Добавить шапку'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Контент профиля */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 pb-6">
          {/* Аватар */}
          <div className="relative inline-block">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={escapeHtml(profileData.username || 'Пользователь')}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  unoptimized={avatarUrl?.includes('s3.twcstorage.ru')}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black">
                  {escapeHtml((profileData.username || 'U')[0].toUpperCase())}
                </div>
              )}
            </div>
            {/* Бейдж уровня */}
            {!isBanned && !isAdmin && (
              <div className={`absolute -bottom-2 -right-2 ${statusLevel.color} text-white rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-xl md:text-2xl shadow-xl border-4 border-white`}>
                {statusLevel.icon}
              </div>
            )}
            {/* Бейдж админа */}
            {!isBanned && isAdmin && roleLabel && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center shadow-xl border-4 border-white z-10" title={roleLabel}>
                <Shield className="w-6 h-6 md:w-7 md:h-7" />
              </div>
            )}
            {/* Бейдж бана */}
            {isBanned && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center shadow-xl border-4 border-white z-10" title="Аккаунт заблокирован">
                <Lock className="w-6 h-6 md:w-7 md:h-7" />
              </div>
            )}
          </div>

          {isOwner && coverError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {coverError}
            </div>
          )}

          {/* Информация о пользователе */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900">
                {escapeHtml(profileData.username || 'Пользователь')}
              </h1>
              {!isBanned && isAdmin && roleLabel && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-bold text-sm shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{roleLabel}</span>
                </div>
              )}
              {!isBanned && (
                <span className={`px-3 py-1.5 ${statusLevel.color} text-white text-sm font-bold rounded-lg shadow-md`}>
                  {statusLevel.name}
                </span>
              )}
              {isBanned && (
                <span className="px-3 py-1.5 bg-red-600 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Заблокирован</span>
                </span>
              )}
              {isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id && (
                <BanUserButton
                  userId={profileData.id}
                  isBanned={profileData.is_banned || false}
                  banReason={profileData.ban_reason}
                  bannedAt={profileData.banned_at}
                  banUntil={profileData.ban_until}
                  userRole={profileData.role}
                />
              )}
            </div>
            
            {!isBanned && profileData.bio && (
              <p className="text-base md:text-lg text-gray-600 mb-4">{escapeHtml(profileData.bio)}</p>
            )}

            {/* Кнопки действий */}
            {!isBanned && currentUser && currentUser.id !== profileData.id && (() => {
              const canFollow = isFollowing || (!privacySettings || 
                privacySettings.who_can_follow === 'everyone' || 
                (privacySettings.who_can_follow === 'friends' && areFriends));
              
              const canAddFriend = !privacySettings || 
                privacySettings.who_can_add_friend === 'everyone' || 
                (privacySettings.who_can_add_friend === 'friends' && areFriends);

              return (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {canFollow && (
                    <FollowButton 
                      username={profileData.username || profileData.id}
                      isFollowing={isFollowing}
                      userId={profileData.id}
                    />
                  )}
                  {canAddFriend && (
                    <FriendButton 
                      userId={profileData.id}
                      username={cleanUsername}
                    />
                  )}
                  <MessageButton 
                    userId={profileData.id}
                    username={cleanUsername}
                  />
                </div>
              );
            })()}

            {/* Статистика */}
            {!isBanned && (
              <div className="flex flex-wrap gap-4 md:gap-6 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Постов в блоге</div>
                    <div className="text-lg font-black text-gray-900">{stats.blog_posts_count}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Достижений</div>
                    <div className="text-lg font-black text-gray-900">{stats.achievements_count}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Подписчиков</div>
                    <div className="text-lg font-black text-gray-900">{stats.followers_count}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Туров</div>
                    <div className="text-lg font-black text-emerald-700">{stats.completed_tours_count}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Друзья и подписчики */}
            {!isBanned && (friendsList.length > 0 || followersList.length > 0 || followingList.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(currentUser?.id === profileData.id || areFriends) && friendsList.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Друзья
                      </h3>
                      <Link
                        href={`/users/${cleanUsername}/friends`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Все
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {friendsList.slice(0, 6).map((friend: any) => (
                        <Link
                          key={friend.id}
                          href={`/users/${friend.username || friend.id}`}
                          className="group relative"
                        >
                          {friend.avatar_url ? (
                            <Image
                              src={friend.avatar_url}
                              alt={friend.first_name && friend.last_name ? `${friend.first_name} ${friend.last_name}` : friend.username || 'Друг'}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-blue-400 transition-colors object-cover"
                              unoptimized={friend.avatar_url?.includes('s3.twcstorage.ru')}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs border-2 border-gray-200 group-hover:border-blue-400 transition-colors">
                              {(friend.first_name?.[0] || friend.username?.[0] || 'Д').toUpperCase()}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {followersList.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-purple-600" />
                        Подписчики
                      </h3>
                      <Link
                        href={`/users/${cleanUsername}/followers`}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        Все ({stats.followers_count})
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {followersList.slice(0, 6).map((follower: any) => (
                        <Link
                          key={follower.id}
                          href={`/users/${follower.username || follower.id}`}
                          className="group relative"
                        >
                          {follower.avatar_url ? (
                            <Image
                              src={follower.avatar_url}
                              alt={follower.first_name && follower.last_name ? `${follower.first_name} ${follower.last_name}` : follower.username || 'Подписчик'}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-purple-400 transition-colors object-cover"
                              unoptimized={follower.avatar_url?.includes('s3.twcstorage.ru')}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border-2 border-gray-200 group-hover:border-purple-400 transition-colors">
                              {(follower.first_name?.[0] || follower.username?.[0] || 'П').toUpperCase()}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {followingList.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-emerald-600" />
                        Подписки
                      </h3>
                      <Link
                        href={`/users/${cleanUsername}/following`}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Все ({followingList.length})
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {followingList.slice(0, 6).map((following: any) => (
                        <Link
                          key={following.id}
                          href={`/users/${following.username || following.id}`}
                          className="group relative"
                        >
                          {following.avatar_url ? (
                            <Image
                              src={following.avatar_url}
                              alt={following.first_name && following.last_name ? `${following.first_name} ${following.last_name}` : following.username || 'Подписка'}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-emerald-400 transition-colors object-cover"
                              unoptimized={following.avatar_url?.includes('s3.twcstorage.ru')}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs border-2 border-gray-200 group-hover:border-emerald-400 transition-colors">
                              {(following.first_name?.[0] || following.username?.[0] || 'П').toUpperCase()}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isOwner && isEditorOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-black text-gray-900">Сменить шапку и аватар</h3>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  resetEditorState();
                  setIsEditorOpen(false);
                }}
                disabled={isUploadingCover || isUploadingAvatar}
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div className="relative h-44">
                  {coverPreview || coverUrl ? (
                    <Image src={coverPreview || coverUrl || ''} alt="Превью шапки" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500" />
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-white">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover || isUploadingAvatar}
                  >
                    <Upload className="w-4 h-4" />
                    Выбрать шапку
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow overflow-hidden bg-gray-100">
                  {avatarPreview || avatarUrl ? (
                    <Image
                      src={avatarPreview || avatarUrl || ''}
                      alt="Превью аватара"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black">
                      {escapeHtml((profileData.username || 'U')[0].toUpperCase())}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingCover || isUploadingAvatar}
                >
                  <Upload className="w-4 h-4" />
                  Выбрать аватар
                </button>
              </div>
              {editorError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {editorError}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => onSelectFile(e, 'avatar')}
                className="hidden"
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => onSelectFile(e, 'cover')}
                className="hidden"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-white"
                onClick={() => {
                  resetEditorState();
                  setIsEditorOpen(false);
                }}
                disabled={isUploadingCover || isUploadingAvatar}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveEditorChanges}
                disabled={isUploadingCover || isUploadingAvatar}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {isUploadingCover || isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isUploadingCover || isUploadingAvatar ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

