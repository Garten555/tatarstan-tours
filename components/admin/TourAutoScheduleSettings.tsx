'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Play, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
];

type BulkResult = {
  toursProcessed: number;
  totalSlotsAdded: number;
  failed: number;
  results: Array<{ title: string; added: number; error?: string }>;
};

export default function TourAutoScheduleSettings() {
  const [config, setConfig] = useState<TourAutoScheduleConfig | null>(null);
  const [timesText, setTimesText] = useState('10:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tour-auto-schedule/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setConfig(data.config);
      setTimesText((data.config.start_times as string[]).join(', '));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleWeekday = (day: number) => {
    if (!config) return;
    const set = new Set(config.weekdays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setConfig({ ...config, weekdays: [...set].sort((a, b) => a - b) });
  };

  const handleSave = async () => {
    if (!config) return;
    const start_times = timesText
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (start_times.length === 0) {
      toast.error('Укажите хотя бы одно время (например 10:00)');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tour-auto-schedule/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...config, start_times } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
      setConfig(data.config);
      setTimesText(data.config.start_times.join(', '));
      toast.success('Шаблон расписания сохранён');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const runBulk = async () => {
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/admin/tours/auto-schedule/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setBulkResult(data);
      toast.success(
        `Готово: +${data.totalSlotsAdded} слотов по ${data.toursProcessed} турам`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Массовое заполнение не удалось');
    } finally {
      setBulkRunning(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        Загрузка шаблона…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Общий шаблон</h2>
          <p className="text-sm text-gray-600 mt-1">
            Один раз настроили — для каждого тура нажимаете «Заполнить» или кнопку ниже для всех
            активных туров. Гиды выбираются автоматически (все гиды, без привязки к городу).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Дни недели</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((d) => {
              const on = config.weekdays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleWeekday(d.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    on
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-300'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время начала (Москва)
            </label>
            <input
              type="text"
              value={timesText}
              onChange={(e) => setTimesText(e.target.value)}
              placeholder="10:00, 14:00"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-1">Несколько времён через запятую</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Длительность (мин)
            </label>
            <input
              type="number"
              min={30}
              max={720}
              value={config.duration_minutes}
              onChange={(e) =>
                setConfig({ ...config, duration_minutes: Number(e.target.value) || 180 })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Слотов вперёд на тур
            </label>
            <input
              type="number"
              min={1}
              max={52}
              value={config.slots_ahead}
              onChange={(e) =>
                setConfig({ ...config, slots_ahead: Number(e.target.value) || 8 })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Горизонт (дней)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={config.horizon_days}
              onChange={(e) =>
                setConfig({ ...config, horizon_days: Number(e.target.value) || 56 })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Выбор гида</label>
          <select
            value={config.guide_strategy}
            onChange={(e) =>
              setConfig({
                ...config,
                guide_strategy: e.target.value as TourAutoScheduleConfig['guide_strategy'],
              })
            }
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl bg-white"
          >
            <option value="least_busy">Меньше всего выездов впереди</option>
            <option value="round_robin">По очереди</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить шаблон
          </button>
          <button
            type="button"
            onClick={() => void runBulk()}
            disabled={bulkRunning}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Заполнить все активные туры
          </button>
        </div>
      </div>

      {bulkResult && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="font-semibold text-gray-900 mb-2">
            Обработано туров: {bulkResult.toursProcessed}, добавлено слотов:{' '}
            {bulkResult.totalSlotsAdded}
            {bulkResult.failed > 0 ? `, ошибок: ${bulkResult.failed}` : ''}
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-gray-700">
            {bulkResult.results.map((r, i) => (
              <li key={i}>
                {r.title}: +{r.added}
                {r.error ? ` — ${r.error}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
