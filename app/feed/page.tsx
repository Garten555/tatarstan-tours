'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, Newspaper } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

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

const FILTERS: { id: FeedType; label: string }[] = [
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
  const [selected, setSelected] = useState<FeedType[]>(['post', 'review', 'achievement']);

  const typesParam = useMemo(() => selected.join(','), [selected]);

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
  }, [typesParam]);

  const toggleFilter = (id: FeedType) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

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

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                selected.includes(f.id)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
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
                <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3 mb-2">
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

                  {item.type === 'post' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Опубликовал(а) новый пост</p>
                      <p className="font-bold text-gray-900">{escapeHtml(item.payload.title || 'Новый пост')}</p>
                    </div>
                  )}

                  {item.type === 'review' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Оставил(а) отзыв</p>
                      <p className="font-bold text-gray-900">Оценка: {item.payload.rating || '-'}/5</p>
                      {item.payload.text ? (
                        <p className="text-sm text-gray-700 mt-1">{escapeHtml(String(item.payload.text).slice(0, 180))}</p>
                      ) : null}
                    </div>
                  )}

                  {item.type === 'achievement' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Получил(а) достижение</p>
                      <p className="font-bold text-gray-900">{escapeHtml(item.payload.badge_name || 'Новое достижение')}</p>
                    </div>
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

