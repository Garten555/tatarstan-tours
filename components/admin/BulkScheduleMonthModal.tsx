'use client';

import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import type { MonthScheduleScope } from '@/lib/tour/month-schedule-scope';
import { Calendar, Loader2, X } from 'lucide-react';

export type BulkMonthMode = 'fill' | 'regenerate';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetMonth: string, mode: BulkMonthMode, scope: MonthScheduleScope) => void;
  running: boolean;
  defaultMonth: string;
};

const radioClass =
  'mt-1 h-4 w-4 shrink-0 border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600';

export function BulkScheduleMonthModal({
  open,
  onClose,
  onConfirm,
  running,
  defaultMonth,
}: Props) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !running) onClose();
      }}
    >
      <div
        className="flex w-full max-w-lg max-h-[92dvh] sm:max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-schedule-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2
              id="bulk-schedule-title"
              className="text-lg font-bold text-gray-900 flex items-center gap-2"
            >
              <Calendar className="w-5 h-5 shrink-0 text-emerald-600" />
              Заполнить расписание
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Месяц или все месяцы с выездами — для каждого тура отдельно
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const month = String(fd.get('targetMonth') || defaultMonth);
            const mode = String(fd.get('monthMode')) === 'regenerate' ? 'regenerate' : 'fill';
            const scope =
              String(fd.get('monthScope')) === 'all_scheduled' ? 'all_scheduled' : 'single';
            onConfirm(month, mode, scope);
          }}
        >
          <div className="modal-body-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 space-y-5">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-700 mb-2">Охват</legend>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-emerald-300 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/40">
                <input
                  type="radio"
                  name="monthScope"
                  value="single"
                  defaultChecked
                  disabled={running}
                  className={radioClass}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">Один месяц</span>
                  <span className="block text-xs text-gray-600 mt-0.5">
                    Только выбранный календарный месяц
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-emerald-300 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/40">
                <input
                  type="radio"
                  name="monthScope"
                  value="all_scheduled"
                  disabled={running}
                  className={radioClass}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    Все месяцы с выездами
                  </span>
                  <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                    По каждому туру — все месяцы, где уже есть слоты (или горизонт шаблона, если тур
                    завершён и выездов нет). Даты тура и статус обновятся автоматически.
                  </span>
                </span>
              </label>
            </fieldset>

            <div>
              <label htmlFor="targetMonth" className="block text-sm font-medium text-gray-700 mb-2">
                Опорный месяц
              </label>
              <input
                id="targetMonth"
                name="targetMonth"
                type="month"
                defaultValue={defaultMonth}
                required
                disabled={running}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Для «одного месяца» — этот месяц. Для «всех с выездами» — добавляется, если у тура
                ещё нет расписания.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-700 mb-2">Режим</legend>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-emerald-300 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/40">
                <input
                  type="radio"
                  name="monthMode"
                  value="fill"
                  defaultChecked
                  disabled={running}
                  className={radioClass}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">Добавить слоты</span>
                  <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                    Создать недостающие выезды по шаблону. Существующие слоты и брони не трогаем.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-amber-300 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/40">
                <input
                  type="radio"
                  name="monthMode"
                  value="regenerate"
                  disabled={running}
                  className={radioClass}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">Пересоставить месяц</span>
                  <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                    Пустые слоты удаляются, расписание строится заново. При переносе выезда с активной
                    бронью участникам приходит email и уведомление на сайте.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          <div className="shrink-0 flex flex-wrap gap-3 border-t border-gray-100 bg-white px-4 py-4 sm:px-6">
            <button
              type="submit"
              disabled={running}
              className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 min-w-[140px]"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Запустить
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="px-5 py-3 border border-gray-300 rounded-xl font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function moscowDefaultMonth(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
  });
  return fmt.format(new Date());
}

export function useDefaultScheduleMonth(): string {
  return moscowDefaultMonth();
}
