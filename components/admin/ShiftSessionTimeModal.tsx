'use client';

import { useEffect, useState } from 'react';
import { Clock, Loader2, Sparkles, X } from 'lucide-react';
import {
  isoToMoscowDatetimeLocalInput,
  moscowDatetimeLocalInputToIso,
} from '@/lib/date/tour-timestamp';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';

type ShiftSessionTarget = {
  id: string;
  start_at: string;
  end_at: string | null;
  guide_id: string | null;
  tour: { id: string; title: string };
  guide_name: string;
};

interface ShiftSessionTimeModalProps {
  session: ShiftSessionTarget | null;
  bufferMinutes: number;
  onClose: () => void;
  onSaved: () => void;
}

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? 'Сервер вернул некорректный ответ'
        : `Ошибка сервера (${res.status}). Обновите страницу и проверьте, что деплой прошёл успешно.`
    );
  }
}

async function callSessionShiftApi(body: Record<string, unknown>) {
  const endpoints: Array<{ method: string; url: string }> = [
    { method: 'POST', url: '/api/admin/team-schedule/session' },
    { method: 'PATCH', url: '/api/admin/team-schedule/session' },
  ];

  let lastError: Error | null = null;

  for (const { method, url } of endpoints) {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Не удалось сохранить'
        );
      }
      return json;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Ошибка сети');
      if (e instanceof TypeError && method === 'POST') {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Не удалось связаться с сервером');
}

export default function ShiftSessionTimeModal({
  session,
  bufferMinutes,
  onClose,
  onSaved,
}: ShiftSessionTimeModalProps) {
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setStartLocal(isoToMoscowDatetimeLocalInput(session.start_at));
    setEndLocal(isoToMoscowDatetimeLocalInput(session.end_at));
    setError(null);
    setHint(null);
  }, [session]);

  if (!session) return null;

  const applySuggested = (suggested: { start_at: string; end_at: string }) => {
    setStartLocal(isoToMoscowDatetimeLocalInput(suggested.start_at));
    setEndLocal(isoToMoscowDatetimeLocalInput(suggested.end_at));
    setHint(
      `Подобрано: ${formatDateTimeShortRu(suggested.start_at)} — ${formatDateTimeShortRu(suggested.end_at)} (МСК)`
    );
  };

  const handleAutoSuggest = async () => {
    if (!session.guide_id) {
      setError('У выезда нет гида — сначала назначьте гида в туре');
      return;
    }
    setError(null);
    setHint(null);
    setAutoLoading(true);
    try {
      const json = await callSessionShiftApi({
        session_id: session.id,
        suggest_only: true,
      });
      const suggested = json.suggested as { start_at: string; end_at: string } | undefined;
      if (!suggested?.start_at) {
        throw new Error('Сервер не вернул предложенное время');
      }
      applySuggested(suggested);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подобрать время');
    } finally {
      setAutoLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!session.guide_id) {
      setError('У выезда нет гида — сначала назначьте гида в туре');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await callSessionShiftApi({
        session_id: session.id,
        auto_shift: true,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сдвинуть автоматически');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    const startIso = moscowDatetimeLocalInputToIso(startLocal);
    if (!startIso) {
      setError('Укажите корректное время начала (МСК)');
      return;
    }
    const endIso = endLocal.trim() ? moscowDatetimeLocalInputToIso(endLocal) : null;
    if (endLocal.trim() && !endIso) {
      setError('Укажите корректное время окончания (МСК)');
      return;
    }
    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('Окончание должно быть позже начала');
      return;
    }

    setSaving(true);
    try {
      await callSessionShiftApi({
        session_id: session.id,
        start_at: startIso,
        end_at: endIso,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-session-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="shift-session-title" className="flex items-center gap-2 text-lg font-black text-gray-900">
              <Clock className="h-5 w-5 text-emerald-600" />
              Сдвинуть время
            </h2>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-700">{session.tour.title}</p>
            <p className="text-xs text-gray-500">Гид: {session.guide_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Сейчас: {formatDateTimeShortRu(session.start_at)}
            {session.end_at ? ` — ${formatDateTimeShortRu(session.end_at)}` : ''} (МСК)
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleAutoSuggest}
              disabled={autoLoading || saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Подобрать время
            </button>
            <button
              type="button"
              onClick={handleAutoSave}
              disabled={autoLoading || saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Сдвинуть автоматически
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Начало (МСК)
            </span>
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Окончание (МСК)
            </span>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <p className="text-xs text-gray-500">
            Между турами одного гида нужен зазор минимум {bufferMinutes} мин. Время указывается по Москве.
            Участникам с бронью уйдёт письмо о переносе.
          </p>

          {hint && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {hint}
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || autoLoading}
            className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || autoLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
