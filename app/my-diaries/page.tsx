// Страница списка дневников пользователя
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TravelDiary } from '@/types';
import { 
  Plus, 
  BookOpen, 
  Eye, 
  Heart, 
  Calendar,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';

export default function MyDiariesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [diaries, setDiaries] = useState<TravelDiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth/login?redirect=/my-diaries');
        return;
      }
      setUser(currentUser);
      await loadDiaries();
    };
    checkAuthAndLoad();
  }, [router, supabase, filter]);

  const loadDiaries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/diaries?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDiaries(data.diaries || []);
      } else {
        throw new Error(data.error || 'Не удалось загрузить дневники');
      }
    } catch (error: any) {
      console.error('Ошибка загрузки дневников:', error);
      toast.error(error.message || 'Ошибка загрузки дневников');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (diaryId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот дневник?')) {
      return;
    }

    try {
      const response = await fetch(`/api/diaries/${diaryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить дневник');
      }

      toast.success('Дневник удален');
      loadDiaries();
    } catch (error: any) {
      console.error('Ошибка удаления дневника:', error);
      toast.error(error.message || 'Не удалось удалить дневник');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8">
      <div className="container mx-auto px-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Мои дневники</h1>
          <Link
            href="/diaries/new"
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать дневник
          </Link>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filter === 'draft'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Черновики
          </button>
          <button
            onClick={() => setFilter('published')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Опубликованные
          </button>
        </div>

        {/* Список дневников */}
        {diaries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Нет дневников</h2>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Создайте свой первый дневник путешествия!'
                : `Нет дневников со статусом "${filter === 'draft' ? 'черновик' : 'опубликовано'}"`
              }
            </p>
            <Link
              href="/diaries/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              <Plus className="w-5 h-5" />
              Создать дневник
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diaries.map((diary) => (
              <div
                key={diary.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow group"
              >
                <Link href={`/diaries/${diary.id}`}>
                  {diary.cover_image_url ? (
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={diary.cover_image_url}
                        alt={escapeHtml(diary.title)}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold">
                      {escapeHtml(diary.title[0] || 'Д')}
                    </div>
                  )}
                </Link>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/diaries/${diary.id}`}>
                      <h3 className="text-xl font-bold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2">
                        {escapeHtml(diary.title)}
                      </h3>
                    </Link>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      diary.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : diary.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {diary.status === 'published' ? 'Опубликован' : diary.status === 'draft' ? 'Черновик' : 'Приватный'}
                    </span>
                  </div>

                  {diary.travel_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(diary.travel_date), 'dd MMMM yyyy', { locale: ru })}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {diary.views_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {diary.likes_count || 0}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/diaries/${diary.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </Link>
                    <button
                      onClick={() => handleDelete(diary.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





















