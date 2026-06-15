'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UploadProgressBar from '@/components/common/UploadProgressBar';
import {
  BulkScheduleMonthModal,
  useDefaultScheduleMonth,
  type BulkMonthMode,
} from '@/components/admin/BulkScheduleMonthModal';
import type { MonthScheduleScope } from '@/lib/tour/month-schedule-scope';
import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import {
  complementTourWeekdays,
  durationMinutesToParts,
  durationPartsToMinutes,
} from '@/lib/tour/auto-schedule-config';
import { GUIDE_REST } from '@/lib/tour/rest-day-ui';

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
  alreadyFull?: number;
  activeGuides?: number;
  results: Array<{
    title: string;
    added: number;
    existingFuture?: number;
    target?: number;
    note?: string;
    error?: string;
  }>;
};

export default function TourAutoScheduleSettings() {
  const [config, setConfig] = useState<TourAutoScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const [bulkProgressLabel, setBulkProgressLabel] = useState('Авторасписание');
  const [bulkProgressSubtitle, setBulkProgressSubtitle] = useState<string | undefined>();
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const defaultScheduleMonth = useDefaultScheduleMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tour-auto-schedule/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setConfig(data.config);
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
    const weekdays = [...set].sort((a, b) => a - b);
    setConfig({
      ...config,
      weekdays,
      guide_rest_weekdays: config.guide_rest_auto
        ? complementTourWeekdays(weekdays)
        : config.guide_rest_weekdays,
    });
  };

  const toggleGuideRestDay = (day: number) => {
    if (!config || config.guide_rest_auto) return;
    const set = new Set(config.guide_rest_weekdays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setConfig({ ...config, guide_rest_weekdays: [...set].sort((a, b) => a - b) });
  };

  const updateStartTime = (index: number, value: string) => {
    if (!config) return;
    const start_times = [...config.start_times];
    start_times[index] = value;
    setConfig({ ...config, start_times });
  };

  const addStartTime = () => {
    if (!config) return;
    const last = config.start_times[config.start_times.length - 1] || '10:00';
    setConfig({ ...config, start_times: [...config.start_times, last] });
  };

  const removeStartTime = (index: number) => {
    if (!config || config.start_times.length <= 1) return;
    setConfig({
      ...config,
      start_times: config.start_times.filter((_, i) => i !== index),
    });
  };

  const durationParts = config
    ? durationMinutesToParts(config.duration_minutes)
    : { days: 0, hours: 3 };

  const setDurationParts = (days: number, hours: number) => {
    if (!config) return;
    setConfig({
      ...config,
      duration_minutes: durationPartsToMinutes(days, hours),
    });
  };

  const handleSave = async () => {
    if (!config) return;
    const start_times = [...new Set(config.start_times.map((t) => t.trim()).filter(Boolean))].sort();
    if (start_times.length === 0) {
      toast.error('Добавьте хотя бы одно время начала');
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
      toast.success('Шаблон расписания сохранён');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const runBulk = async (
    targetMonth: string,
    monthMode: BulkMonthMode,
    monthScope: MonthScheduleScope
  ) => {
    setBulkModalOpen(false);
    setBulkRunning(true);
    setBulkResult(null);
    setBulkProgress(null);
    setBulkProgressLabel('Загрузка списка туров…');
    setBulkProgressSubtitle(undefined);

    try {
      const listRes = await fetch('/api/admin/tours/auto-schedule/bulk', { cache: 'no-store' });
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || 'Не удалось получить список туров');

      const tours: Array<{ id: string; title: string }> = listData.tours ?? [];
      const activeGuides = listData.activeGuides ?? 0;
      const total = tours.length;

      if (total === 0) {
        toast.error('Нет туров для заполнения');
        return;
      }

      setBulkProgressLabel('Авторасписание');
      const results: BulkResult['results'] = [];
      let totalAdded = 0;

      for (let i = 0; i < total; i++) {
        const tour = tours[i];
        setBulkProgressSubtitle(tour.title);
        setBulkProgress(Math.round((i / total) * 100));

        const res = await fetch(`/api/admin/tours/${tour.id}/auto-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apply: true, targetMonth, monthMode, monthScope }),
        });
        const data = await res.json();

        if (!res.ok) {
          results.push({
            title: tour.title,
            added: 0,
            error: data.error || 'Ошибка',
          });
        } else {
          const added = Array.isArray(data.newSlots) ? data.newSlots.length : 0;
          const rescheduled = Number(data.rescheduledBooked ?? 0);
          const removed = Number(data.removedEmpty ?? 0);
          totalAdded += added;
          let note: string | undefined;
          if (added === 0 && rescheduled === 0 && removed === 0) {
            if (data.zeroReason === 'already_full') {
              note = `уже ${data.existingFutureCount} будущих слотов (лимит ${data.targetSlots})`;
            } else if (data.zeroReason === 'no_guides') {
              note = 'нет активных гидов — добавьте роль guide';
            } else if ((data.skippedNoGuide ?? 0) > 0) {
              note = `нет свободного гида (${data.skippedNoGuide} пропусков)`;
            } else {
              note = 'нет свободных дат в горизонте';
            }
          }
          if (rescheduled > 0) {
            note = note ? `${note}; перенесено с бронью: ${rescheduled}` : `перенесено с бронью: ${rescheduled}`;
          }
          if (removed > 0) {
            note = note ? `${note}; удалено пустых: ${removed}` : `удалено пустых: ${removed}`;
          }
          if (Array.isArray(data.monthsProcessed) && data.monthsProcessed.length > 1) {
            note = note
              ? `${note}; месяцы: ${data.monthsProcessed.join(', ')}`
              : `месяцы: ${data.monthsProcessed.join(', ')}`;
          }
          if (data.catalogDatesUpdated) {
            note = note ? `${note}; даты тура обновлены` : 'даты тура обновлены';
          }
          results.push({
            title: data.tourTitle || tour.title,
            added,
            existingFuture: data.existingFutureCount,
            target: data.targetSlots,
            note,
          });
        }

        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }

      const failed = results.filter((r) => r.error).length;
      const alreadyFull = results.filter((r) => r.note?.startsWith('уже')).length;
      const bulk: BulkResult = {
        toursProcessed: total,
        totalSlotsAdded: totalAdded,
        failed,
        alreadyFull,
        activeGuides,
        results,
      };
      setBulkResult(bulk);

      if (totalAdded === 0) {
        const anyReschedule = results.some((r) => r.note?.includes('перенесено'));
        if (anyReschedule) {
          toast.success('Расписание пересоставлено, участникам с бронью отправлены уведомления');
        } else if (alreadyFull === total) {
          toast(
            `Слотов не добавлено: у всех туров уже есть будущие выезды (лимит «слотов вперёд»). Гидов: ${activeGuides}.`,
            { icon: 'ℹ️' }
          );
        } else if (activeGuides === 0) {
          toast.error('Нет активных гидов (роль guide). Слоты не создаются.');
        } else {
          toast(
            `+0 слотов. Гидов: ${activeGuides}. Смотрите детали ниже.`,
            { icon: '⚠️' }
          );
        }
      } else {
        toast.success(`Готово: +${totalAdded} слотов по ${total} турам`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Массовое заполнение не удалось');
    } finally {
      setBulkRunning(false);
      setBulkProgress(null);
      setBulkProgressSubtitle(undefined);
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
      {bulkRunning && (
        <UploadProgressBar
          layout="floating"
          label={bulkProgressLabel}
          subtitle={bulkProgressSubtitle}
          percent={bulkProgress}
          indeterminateStyle="shuttle"
        />
      )}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Общий шаблон</h2>
          <p className="text-sm text-gray-600 mt-1">
            Один раз настроили — для каждого тура «Заполнить по шаблону» или кнопка ниже для всех
            туров сразу. При 6 рабочих днях (пн–сб) у каждого гида минимум воскресенье без туров
            плюс один чередующийся день среди пн–сб.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Рабочие дни туров</label>
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

        <div className={`rounded-xl border p-4 space-y-4 ${GUIDE_REST.section}`}>
          <div>
            <h3 className="text-sm font-bold text-violet-950">Выходные гидов</h3>
            <p className="text-xs text-gray-600 mt-1">
              Выходной — только в днях без туров по шаблону (например, воскресенье при турах пн–сб).
              В рабочие дни гид может вести сколько угодно выездов; отдельный «день без туров» среди
              пн–сб включается опционально ниже.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.guide_rest_auto}
              onChange={(e) => {
                const guide_rest_auto = e.target.checked;
                setConfig({
                  ...config,
                  guide_rest_auto,
                  guide_rest_weekdays: guide_rest_auto
                    ? complementTourWeekdays(config.weekdays)
                    : config.guide_rest_weekdays,
                });
              }}
              className="mt-1"
            />
            <span className="text-sm text-gray-800">
              <span className="font-semibold">Авто под рабочие дни</span> — отдых в днях без туров
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дни отдыха гида
              {config.guide_rest_auto && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (обновляются автоматически)
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((d) => {
                const on = config.guide_rest_weekdays.includes(d.value);
                const isTourDay = config.weekdays.includes(d.value);
                return (
                  <button
                    key={`rest-${d.value}`}
                    type="button"
                    disabled={config.guide_rest_auto}
                    onClick={() => toggleGuideRestDay(d.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      on
                        ? GUIDE_REST.dayButtonOn
                        : GUIDE_REST.dayButtonOff
                    } ${config.guide_rest_auto ? GUIDE_REST.dayButtonDisabled : ''} ${
                      isTourDay && on ? 'ring-2 ring-amber-300/90' : ''
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            {config.weekdays.some((d) => config.guide_rest_weekdays.includes(d)) && (
              <p className="text-xs text-amber-800 mt-2">
                День совпадает с туровым — при включённой ротации это не полный выходной, а чередование
                «день без выезда».
              </p>
            )}
          </div>

          <label
            className={`flex items-start gap-3 ${config.guide_rest_auto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={config.guide_rotate_rest_on_tour_days}
              disabled={config.guide_rest_auto}
              onChange={(e) =>
                setConfig({ ...config, guide_rotate_rest_on_tour_days: e.target.checked })
              }
              className="mt-1"
            />
            <span className="text-sm text-gray-800">
              <span className="font-semibold">Чередовать «день без выезда» среди рабочих</span>{' '}
              (редкий режим: при ручных выходных — у каждого гида один туровый день в неделю без
              слотов; при авто-выходных не используется)
            </span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Время начала (местное, UTC+3)
              </label>
              <button
                type="button"
                onClick={addStartTime}
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-4 h-4" />
                Добавить время
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {config.start_times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateStartTime(index, e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                  {config.start_times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStartTime(index)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                      title="Убрать"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Если на первое время все гиды заняты — скрипт попробует следующее в списке, затем
              другие дни по шаблону.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Длительность выезда
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={durationParts.days}
                  onChange={(e) =>
                    setDurationParts(Number(e.target.value) || 0, durationParts.hours)
                  }
                  className="w-20 px-3 py-3 border border-gray-300 rounded-xl text-center"
                />
                <span className="text-sm text-gray-600">дн.</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={durationParts.hours}
                  onChange={(e) =>
                    setDurationParts(durationParts.days, Number(e.target.value) || 0)
                  }
                  className="w-20 px-3 py-3 border border-gray-300 rounded-xl text-center"
                />
                <span className="text-sm text-gray-600">ч.</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Например: 0 дн. 3 ч. — обычная экскурсия; 2 дн. 0 ч. — двухдневный тур.
            </p>
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
            onClick={() => setBulkModalOpen(true)}
            disabled={bulkRunning}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Заполнить все туры
          </button>
        </div>
      </div>

      <BulkScheduleMonthModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onConfirm={(month, mode, scope) => void runBulk(month, mode, scope)}
        running={bulkRunning}
        defaultMonth={defaultScheduleMonth}
      />

      {bulkResult && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="font-semibold text-gray-900 mb-2">
            Обработано туров: {bulkResult.toursProcessed}, добавлено слотов:{' '}
            {bulkResult.totalSlotsAdded}
            {bulkResult.activeGuides != null ? ` · гидов: ${bulkResult.activeGuides}` : ''}
            {bulkResult.failed > 0 ? ` · ошибок: ${bulkResult.failed}` : ''}
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-gray-700">
            {bulkResult.results.map((r, i) => (
              <li key={i}>
                {r.title}: +{r.added}
                {r.existingFuture != null && r.target != null && r.added === 0
                  ? ` (сейчас ${r.existingFuture}/${r.target})`
                  : ''}
                {r.note ? ` — ${r.note}` : ''}
                {r.error ? ` — ${r.error}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
