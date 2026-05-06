/** Даты выезда для UI и писем: при брони со слотом — из tour_sessions, иначе из строки тура */

export type BookingSessionSlot = {
  start_at: string;
  end_at: string | null;
};

export function effectiveBookingStartIso(params: {
  sessionSlot: BookingSessionSlot | null | undefined;
  tourStart: string | null | undefined;
}): string {
  const s = params.sessionSlot?.start_at;
  if (s) return s;
  return params.tourStart ?? '';
}

export function effectiveBookingEndIso(params: {
  sessionSlot: BookingSessionSlot | null | undefined;
  tourEnd: string | null | undefined;
}): string | null {
  if (params.sessionSlot?.start_at) {
    return params.sessionSlot.end_at ?? null;
  }
  return params.tourEnd ?? null;
}

/** Сервер (email): стабильное отображение для РФ независимо от TZ процесса Node */
export function formatBookingInstantRuMoscow(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}
