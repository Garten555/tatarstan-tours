/**
 * Туры без строк в tour_sessions: на странице тура показываем одну «виртуальную» дату
 * из полей тура (start_date / end_date). Этот id не существует в БД и не передаётся в ?session=.
 */
export const LEGACY_TOUR_SESSION_ID =
  '00000000-0000-4000-8000-000000000001' as const;

export function isLegacyTourSessionId(sessionId: string | null | undefined): boolean {
  if (sessionId == null || sessionId === '') return false;
  return sessionId === LEGACY_TOUR_SESSION_ID;
}
