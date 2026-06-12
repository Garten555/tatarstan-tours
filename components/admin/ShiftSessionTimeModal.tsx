'use client';

import { useEffect, useState } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import {
  datetimeLocalInputToIso,
  isoToDatetimeLocalInput,
} from '@/lib/date/tour-timestamp';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';

type ShiftSessionTarget = {
  id: string;
  start_at: string;
  end_at: string | null;
  tour: { id: string; title: string };
  guide_name: string;
};

interface ShiftSessionTimeModalProps {
  session: ShiftSessionTarget | null;
  bufferMinutes: number;
  onClose: () => void;
  onSaved: () => void;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setStartLocal(isoToDatetimeLocalInput(session.start_at));
    setEndLocal(isoToDatetimeLocalInput(session.end_at));
    setError(null);
  }, [session]);

  if (!session) return null;

  const handleSave = async () => {
    setError(null);
    const startIso = datetimeLocalInputToIso(startLocal);
    if (!startIso) {
      setError('Укажите корректное время начала');
      return;
    }
    const endIso = endLocal.trim() ? datetimeLocalInputToIso(endLocal) : null;
    if (endLocal.trim() && !endIso) {
      setError('Укажите корректное время окончания');
      return;
    }
    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('Окончание должно быть позже начала');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/team-schedule/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          start_at: startIso,
          end_at: endIso,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Не удалось сохранить');
      }
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
            {session.end_at ? ` — ${formatDateTimeShortRu(session.end_at)}` : ''}
          </p>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Начало
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
              Окончание
            </span>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <p className="text-xs text-gray-500">
            Между турами одного гида нужен зазор минимум {bufferMinutes} мин. Участникам с бронью уйдёт
            письмо о переносе.
          </p>

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
            disabled={saving}
            className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
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
