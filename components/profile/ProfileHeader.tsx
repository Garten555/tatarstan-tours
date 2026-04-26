'use client';

import Image from 'next/image';
import Link from 'next/link';
import { 
  Users, 
  UserPlus,
  UserMinus,
  Shield,
  Lock,
  CheckCircle2,
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
}: ProfileHeaderProps) {
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
      <div className="relative h-48 md:h-56 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 border-b border-gray-200 overflow-hidden">
        {/* Декоративные элементы */}
        <div className="absolute inset-0">
          {/* Градиентные круги */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-300/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-400/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          
          {/* Геометрические формы */}
          <div className="absolute top-10 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          
          {/* Паттерн */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>
        </div>
      </div>

      {/* Контент профиля */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 pb-6">
          {/* Аватар */}
          <div className="relative inline-block">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
              {profileData.avatar_url ? (
                <Image
                  src={profileData.avatar_url}
                  alt={escapeHtml(profileData.username || 'Пользователь')}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  unoptimized={profileData.avatar_url?.includes('s3.twcstorage.ru')}
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
    </div>
  );
}

