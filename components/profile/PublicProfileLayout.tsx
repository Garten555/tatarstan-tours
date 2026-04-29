import Link from 'next/link';
import { Lock, Compass, Globe, BookOpen, ImageIcon, ExternalLink } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import BlogPostsList from '@/components/blog/BlogPostsList';
import UserGallery from '@/components/passport/UserGallery';
import PublicPassportSection from '@/components/passport/PublicPassportSection';
import ProfileHeader from '@/components/profile/ProfileHeader';

interface PublicProfileLayoutProps {
  profileData: any;
  profileCoverUrl: string | null;
  stats: any;
  statusLevel: any;
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
  recentBlogPosts: any[];
  allUserMedia: any[];
  recentAchievements: any[];
  completedTours: any[];
  upcomingTours: any[];
  locations: any[];
  achievementStyles: Record<string, { icon: string; bg: string; border: string }>;
}

export default function PublicProfileLayout({
  profileData,
  profileCoverUrl,
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
  recentBlogPosts,
  allUserMedia,
  recentAchievements,
  completedTours,
  upcomingTours,
  locations,
  achievementStyles,
}: PublicProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 pt-[4.5rem] lg:pt-[5rem]">
      <div id="profile" className="scroll-mt-20">
        <ProfileHeader
          profileData={profileData}
          profileCoverUrl={profileCoverUrl}
          stats={stats}
          statusLevel={statusLevel}
          isBanned={isBanned}
          isAdmin={isAdmin}
          isCurrentUserAdmin={isCurrentUserAdmin}
          currentUser={currentUser}
          cleanUsername={cleanUsername}
          privacySettings={privacySettings}
          areFriends={areFriends}
          isFollowing={isFollowing}
          friendsList={friendsList}
          followersList={followersList}
          followingList={followingList}
          roleLabel={roleLabel}
        />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 h-fit">
            {!isBanned && currentUser && currentUser.id === profileData.id && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
                <div className="text-sm font-bold text-gray-800">Быстрые действия</div>
                <Link
                  href="/tours"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">Найти туры</div>
                    <div className="text-xs text-gray-600">Откройте новые места</div>
                  </div>
                </Link>
                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 transition"
                >
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg text-white">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">Настройки</div>
                    <div className="text-xs text-gray-600">Управляйте профилем</div>
                  </div>
                </Link>
              </div>
            )}

            {!isBanned && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-sm font-bold text-gray-800 mb-3">Статистика дневника</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <div className="text-xs text-gray-500">Посты</div>
                    <div className="text-lg font-black text-gray-900">{stats.blog_posts_count}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <div className="text-xs text-gray-500">Достижения</div>
                    <div className="text-lg font-black text-gray-900">{stats.achievements_count}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <div className="text-xs text-gray-500">Подписчики</div>
                    <div className="text-lg font-black text-gray-900">{stats.followers_count}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-200">
                    <div className="text-xs text-emerald-700">Туры</div>
                    <div className="text-lg font-black text-emerald-800">{stats.completed_tours_count}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="lg:col-span-6 space-y-4">
            {isBanned ? (
              <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-300 shadow-sm">
                <Lock className="w-20 h-20 mx-auto text-red-600 mb-4" />
                <h2 className="text-3xl font-black text-red-900 mb-3">Аккаунт заблокирован</h2>
                <p className="text-red-800 font-semibold">Информация дневника временно недоступна.</p>
                {profileData.ban_reason && (
                  <p className="mt-3 text-red-700 font-medium">{escapeHtml(profileData.ban_reason)}</p>
                )}
              </div>
            ) : (
              <>
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 md:p-5">
                  <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                      Лента туристического дневника
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Посты, истории, фото и впечатления в одном потоке</p>
                  </div>
                  <BlogPostsList
                    initialPosts={recentBlogPosts}
                    userId={profileData.id}
                    completedTours={completedTours}
                    upcomingTours={upcomingTours}
                    isOwner={currentUser?.id === profileData.id}
                    isAdminView={Boolean(isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id)}
                  />
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-emerald-600" />
                      Галерея путешествий
                    </h3>
                    {allUserMedia.length > 0 && (
                      <Link
                        href={`/users/${profileData.username || profileData.id}/gallery`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm font-semibold"
                      >
                        Все
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                  <UserGallery
                    media={allUserMedia.slice(0, 12)}
                    userId={profileData.id}
                    isOwner={currentUser?.id === profileData.id}
                    username={profileData.username || profileData.id}
                    showViewAll={true}
                  />
                </section>
              </>
            )}
          </main>

          <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 h-fit">
            {!isBanned && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-sm font-bold text-gray-800 mb-2">Туристический паспорт</div>
                <p className="text-xs text-gray-600 mb-3">
                  Достижения, туры и география в удобной вкладочной форме.
                </p>
                <a
                  href="#passport"
                  className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 transition-colors"
                >
                  Открыть паспорт
                </a>
              </div>
            )}

            {!isBanned && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-sm font-bold text-gray-800 mb-3">География автора</div>
                {locations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {locations.slice(0, 10).map((location) => (
                      <span
                        key={location.name}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {location.name} · {location.visit_count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Пока нет отмеченных локаций</div>
                )}
              </div>
            )}
          </aside>
        </div>

        <div id="passport" className="scroll-mt-20 mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {(isBanned || profileData.is_banned) ? null : (
            <PublicPassportSection
              achievements={recentAchievements}
              completedTours={completedTours}
              locations={locations}
              reputationScore={profileData.reputation_score || 0}
              achievementStyles={achievementStyles}
              isOwner={currentUser?.id === profileData.id}
              username={profileData.username}
            />
          )}
        </div>
      </div>
    </div>
  );
}
