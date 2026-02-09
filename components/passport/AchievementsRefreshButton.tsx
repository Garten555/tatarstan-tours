'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AchievementsRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/passport/achievements/repair', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить достижения');
      }
      if ((data.awarded || 0) > 0) {
        toast.success(`Добавлено достижений: ${data.awarded}`);
      } else {
        toast('Новых достижений нет', { icon: 'ℹ️' });
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить достижения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Проверяем...' : 'Проверить достижения'}
    </button>
  );
}

















