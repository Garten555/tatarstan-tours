/** Коды ?error= на странице тура после редиректа с /booking */
export const BOOKING_TOUR_REDIRECT_MESSAGES = {
  pick_session: 'Выберите дату выезда перед бронированием.',
  session: 'Выбранный слот недоступен. Выберите другой выезд.',
  expired: 'Этот выезд уже прошёл. Выберите актуальную дату.',
  full: 'На этот выезд мест больше нет. Выберите другую дату.',
} as const;

export type BookingTourRedirectCode = keyof typeof BOOKING_TOUR_REDIRECT_MESSAGES;

export function parseBookingTourRedirectError(
  raw: string | string[] | undefined
): BookingTourRedirectCode | undefined {
  if (!raw || Array.isArray(raw)) return undefined;
  return raw in BOOKING_TOUR_REDIRECT_MESSAGES
    ? (raw as BookingTourRedirectCode)
    : undefined;
}
