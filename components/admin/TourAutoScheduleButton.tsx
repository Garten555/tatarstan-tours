'use client';

import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';

type Props = {
  tourId: string;
  onApplied?: () => void;
};

export default function TourAutoScheduleButton({ tourId, onApplied }: Props) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<
    Array<{ start_at: string; end_at: string; guide_id: string }> | null
  >(null);

  const run = async (apply: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/auto-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      if (!apply) {
        setPreview(data.newSlots ?? []);
        const n = (data.newSlots ?? []).length;
        toast.success(
          n > 0
            ? `Можно добавить ${n} слотов (ещё ${data.existingFutureCount ?? 0} уже есть)`
            : 'Новых слотов не требуется — цель уже достигнута'
        );
        return;
      }

      const n = data.newSlots?.length ?? 0;
      if (n === 0) {
        toast.success('Расписание уже заполнено по шаблону');
      } else {
        toast.success(`Добавлено слотов: ${n}`);
        setPreview(null);
        onApplied?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось заполнить расписание');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <CalendarClock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900">Авторасписание</h3>
          <p className="text-sm text-gray-600 mt-1">
            По общему шаблону из раздела{' '}
            <a href="/admin/tour-schedule" className="text-blue-600 hover:underline">
              Авторасписание
            </a>
            . Добавляет только недостающие будущие слоты; гид выбирается с учётом занятости.
            Работает для завершённых и отменённых туров — после добавления слотов тур снова станет активным.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-blue-300 text-blue-800 bg-white hover:bg-blue-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Предпросмотр'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(true)}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Заполнить по шаблону
        </button>
      </div>
      {preview && preview.length > 0 && (
        <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto bg-white rounded-xl p-3 border border-blue-100">
          {preview.map((s, i) => (
            <li key={i}>
              {formatDateTimeShortRu(s.start_at)} — {formatDateTimeShortRu(s.end_at)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
