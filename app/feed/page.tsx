'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Loader2, Newspaper } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import ClampedText from '@/components/ui/ClampedText';
import { FeedAspectCover } from '@/components/feed/FeedAspectCover';

type FeedType = 'post' | 'review' | 'achievement';

type FeedItem = {
  id: string;
  type: FeedType;
  created_at: string;
  actor: {
    id: string;
    username: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  payload: Record<string, any>;
};

const FILTERS: { id: FeedType | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'post', label: 'Посты' },
  { id: 'review', label: 'Отзывы' },
  { id: 'achievement', label: 'Достижения' },
];

function actorName(actor: FeedItem['actor']) {
  const full = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim();
  return full || actor.username || 'Пользователь';
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  /** Одна активная «вкладка» — всегда понятно, что выбрано (раньше при «все три» все три были зелёными). */
  const [typeFilter, setTypeFilter] = useState<FeedType | 'all'>('all');

  const typesParam = useMemo(
    () => (typeFilter === 'all' ? 'post,review,achievement' : typeFilter),
    [typeFilter]
  );

  const load = useCallback(
    async (append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const params = new URLSearchParams();
        params.set('types', typesParam);
        params.set('limit', '20');
        if (append && cursor) params.set('cursor', cursor);
        const res = await fetch(`/api/feed?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Не удалось загрузить ленту');
        const nextItems = (data.items || []) as FeedItem[];
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setCursor(data.next_cursor || null);
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typesParam, cursor]
  );

  useEffect(() => {
    setCursor(null);
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- перезагрузка только при смене набора типов
  }, [typesParam]);

  return (
    <main className="min-h-screen bg-slate-100 pt-24 pb-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Newspaper className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Лента друзей и подписок</h1>
            <p className="text-gray-600">События от друзей и тех, на кого вы подписаны</p>
          </div>
        </div>

        <div
          className="mb-6 inline-flex flex-wrap gap-0 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Тип событий в ленте"
        >
          {FILTERS.map((f) => {
            const active = typeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeFilter(f.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-gray-500">Загрузка ленты...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-semibold">Пока нет событий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const name = actorName(item.actor);
              const username = item.actor.username || item.actor.id;
              const profileHref = `/users/${username}`;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 min-w-0 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {item.actor.avatar_url ? (
                      <img src={item.actor.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link href={profileHref} className="font-bold text-gray-900 hover:text-emerald-700">
                        {escapeHtml(name)}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {item.type === 'post' && (() => {
                    const slug = item.payload.slug ? String(item.payload.slug) : '';
                    const blogBase = item.actor.username || item.actor.id;
                    const postHref = slug
                      ? `/users/${encodeURIComponent(String(blogBase))}/blog/${encodeURIComponent(String(slug))}`
                      : null;
                    const cover = item.payload.cover_image_url
                      ? String(item.payload.cover_image_url)
                      : '';
                    const excerptRaw = item.payload.excerpt != null ? String(item.payload.excerpt) : '';
                    if (!postHref) {
                      return (
                        <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-sm text-amber-900">
                          Пост без ссылки (нет slug).
                        </div>
                      );
                    }
                    return (
                      <Link
                        href={postHref}
                        className="group mt-1 flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 transition hover:border-emerald-200 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        {cover ? (
                          <FeedAspectCover
                            src={cover}
                            alt=""
                            className="rounded-t-2xl group-hover:opacity-[0.98]"
                          />
                        ) : null}
                        <div className="min-w-0 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                            Новый пост
                          </p>
                          <ClampedText lines={2} className="font-bold text-gray-900 text-base leading-snug">
                            {escapeHtml(String(item.payload.title || 'Новый пост'))}
                          </ClampedText>
                          {excerptRaw ? (
                            <ClampedText lines={2} className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                              {escapeHtml(excerptRaw)}
                            </ClampedText>
                          ) : null}
                          <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-bold text-emerald-700">
                            Читать пост
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </div>
                      </Link>
                    );
                  })()}

                  {item.type === 'review' && (() => {
                    const tour = item.payload.tour as { slug?: string; title?: string; cover_image?: string } | null;
                    const tourSlug = tour?.slug ? String(tour.slug) : '';
                    const tourHref = tourSlug ? `/tours/${tourSlug}` : null;
                    const tourCover = tour?.cover_image ? String(tour.cover_image) : '';
                    const body = (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Отзыв</p>
                        <p className="font-bold text-gray-900">
                          Оценка: {item.payload.rating != null ? String(item.payload.rating) : '-'}/5
                          {tour?.title ? (
                            <span className="block mt-0.5 text-sm font-semibold text-gray-700">
                              Тур: {escapeHtml(String(tour.title))}
                            </span>
                          ) : null}
                        </p>
                        {item.payload.text ? (
                          <ClampedText lines={3} className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                            {escapeHtml(String(item.payload.text))}
                          </ClampedText>
                        ) : null}
                        {tourHref ? (
                          <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-bold text-emerald-700">
                            К туру
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </span>
                        ) : null}
                      </div>
                    );
                    const shell = (
                      <>
                        {tourCover && tourHref ? (
                          <FeedAspectCover src={tourCover} alt="" className="rounded-t-2xl" />
                        ) : null}
                        <div className="px-4 py-3">{body}</div>
                      </>
                    );
                    return tourHref ? (
                      <Link
                        href={tourHref}
                        className="group mt-1 flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 transition hover:border-emerald-200 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 min-w-0"
                      >
                        {shell}
                      </Link>
                    ) : (
                      <div className="mt-1 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 min-w-0">
                        {shell}
                      </div>
                    );
                  })()}

                  {item.type === 'achievement' && (
                    <Link
                      href={profileHref}
                      className="group mt-1 block overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 transition hover:border-emerald-200 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 min-w-0"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Достижение</p>
                      <div className="flex items-start gap-3 min-w-0">
                        {item.payload.badge_icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={String(item.payload.badge_icon_url)}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover bg-white border border-gray-100"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <ClampedText lines={2} className="font-bold text-gray-900">
                            {escapeHtml(String(item.payload.badge_name || 'Новое достижение'))}
                          </ClampedText>
                          {item.payload.badge_description ? (
                            <ClampedText lines={2} className="mt-1 text-sm text-gray-600 leading-relaxed">
                              {escapeHtml(String(item.payload.badge_description))}
                            </ClampedText>
                          ) : null}
                          <span className="mt-2 inline-flex items-center gap-0.5 text-sm font-bold text-emerald-700">
                            Профиль
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}
                </article>
              );
            })}

            {cursor && (
              <div className="pt-2">
                <button
                  onClick={() => load(true)}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Загрузка...' : 'Загрузить еще'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

