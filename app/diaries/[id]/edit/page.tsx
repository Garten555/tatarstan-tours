// Страница редактирования дневника
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UniqueDiaryEditor } from '@/components/diaries/UniqueDiaryEditor';
import { TravelDiary } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EditDiaryPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [diary, setDiary] = useState<TravelDiary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const diaryId = params.id as string;

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push(`/auth/login?redirect=/diaries/${diaryId}/edit`);
        return;
      }
      setUser(currentUser);

      // Загружаем дневник
      try {
        const response = await fetch(`/api/diaries/${diaryId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Дневник не найден');
        }

        if (data.diary.user_id !== currentUser.id) {
          throw new Error('У вас нет прав на редактирование этого дневника');
        }

        setDiary(data.diary);
      } catch (err: any) {
        console.error('Ошибка загрузки дневника:', err);
        setError(err.message || 'Ошибка загрузки дневника');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndLoad();
  }, [router, supabase, diaryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error || 'Дневник не найден'}</p>
          <button
            onClick={() => router.push('/my-diaries')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Вернуться к дневникам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8">
      <UniqueDiaryEditor 
        diary={diary}
        onSave={(updatedDiary) => {
          router.push(`/diaries/${updatedDiary.id}`);
        }}
        onCancel={() => {
          router.push(`/diaries/${diary.id}`);
        }}
      />
    </div>
  );
}

