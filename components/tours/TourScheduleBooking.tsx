'use client';

import { useMemo, useState } from 'react';
import TourBookingCard from '@/components/tours/TourBookingCard';
import { useTourSessions } from '@/components/tours/TourSessionsProvider';
import type { TourSessionOption } from '@/lib/types/tour-session-option';
import {
  formatSessionShort,
  sessionAvailableSpots,
} from '@/lib/tour/session-display';
import { isLegacyTourSessionId } from '@/lib/tour/legacy-session';
import { Calendar } from 'lucide-react';

export type { TourSessionOption };

type TourScheduleBookingProps = {
  tourId: string;
  price: number;
  /** Если слотов нет (миграция не применена) — лимиты с строки тура */
  tourMaxParticipants: number;
  tourCurrentParticipants: number;
  /** Передаётся, только если компонент не обёрнут в TourSessionsProvider */
  sessions?: TourSessionOption[];
};

/**
 * Карточка бронирования: без слотов — как раньше; со слотами — выбор даты внутри карточки и ссылка с ?session=
 */
export default function TourScheduleBooking({
  tourId,
  price,
  tourMaxParticipants,
  tourCurrentParticipants,
  sessions: sessionsProp,
}: TourScheduleBookingProps) {
  const ctx = useTourSessions();

  const validFromProps = useMemo(
    () =>
      (sessionsProp || []).filter(
        (s) => s?.id && s?.start_at && typeof s.max_participants === 'number'
      ),
    [sessionsProp]
  );

  const [localSelectedId, setLocalSelectedId] = useState<string>(
    () => validFromProps[0]?.id ?? ''
  );

  const validSessions = ctx?.hasSessions ? ctx.sessions : validFromProps;
  const selectedId =
    ctx?.hasSessions && ctx.selectedId
      ? ctx.selectedId
      : localSelectedId;
  const setSelectedId = ctx?.hasSessions ? ctx.setSelectedId : setLocalSelectedId;

  if (validSessions.length === 0) {
    const availableSpots = tourMaxParticipants - (tourCurrentParticipants || 0);
    return (
      <TourBookingCard
        price={price}
        availableSpots={availableSpots}
        maxParticipants={tourMaxParticipants}
        isFullyBooked={availableSpots <= 0}
        bookingHref={`/booking?tour=${encodeURIComponent(tourId)}`}
      />
    );
  }

  const selected =
    validSessions.find((s) => s.id === selectedId) ?? validSessions[0];
  const maxP = selected.max_participants;
  const cur = selected.current_participants ?? 0;
  const availableSpots = maxP - cur;

  const bookingHref = isLegacyTourSessionId(selected.id)
    ? `/booking?tour=${encodeURIComponent(tourId)}`
    : `/booking?tour=${encodeURIComponent(tourId)}&session=${encodeURIComponent(selected.id)}`;

  const dateBlock =
    validSessions.length === 1 ? (
      <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50/60 px-3 py-3 sm:py-3.5">
        <div className="flex items-start gap-2.5">
          <Calendar className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 mb-1">
              Дата выезда
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              {formatSessionShort(validSessions[0].start_at)}
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className="rounded-xl border-2 border-gray-200 bg-gray-50/80 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-emerald-700 flex-shrink-0" aria-hidden />
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-gray-600">
              Шаг 1
            </div>
            <h3 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
              Выберите дату выезда
            </h3>
          </div>
        </div>
        <ul
          className="flex flex-col gap-2 max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain pr-0.5 -mr-0.5"
          role="radiogroup"
          aria-label="Дата выезда"
        >
          {validSessions.map((s) => {
            const spots = sessionAvailableSpots(s);
            const disabled = spots <= 0;
            const active = s.id === selected.id;
            const label = formatSessionShort(s.start_at);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => setSelectedId(s.id)}
                  className={[
                    'w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors shadow-sm',
                    disabled
                      ? 'cursor-not-allowed border-gray-200 bg-white/60 opacity-60'
                      : active
                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-200/80 shadow-md'
                        : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50',
                  ].join(' ')}
                >
                  <span className="font-bold text-gray-900">{label}</span>
                  <span className="mt-1 block text-xs text-gray-600 leading-snug">
                    {spots > 0 ? (
                      <>
                        Свободно:{' '}
                        <span className="font-semibold text-emerald-700">{spots}</span> из{' '}
                        {s.max_participants}
                      </>
                    ) : (
                      <span className="font-semibold text-amber-800">Мест нет</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <TourBookingCard
      price={price}
      availableSpots={availableSpots}
      maxParticipants={maxP}
      isFullyBooked={availableSpots <= 0}
      bookingHref={bookingHref}
      beforeAvailability={dateBlock}
      bookingFlowSteps={validSessions.length > 1}
      bookingCtaLabel={
        validSessions.length > 1 ? 'Забронировать на эту дату' : undefined
      }
    />
  );
}
