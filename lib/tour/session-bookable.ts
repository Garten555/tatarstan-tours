/**
 * Совпадает с правилами `/booking` и `POST /api/bookings`:
 * есть end_at — слот доступен, пока end_at в будущем;
 * нет end_at — пока start_at в будущем.
 */
export function isTourSessionStillBookable(
  start_at: string,
  end_at: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const endMs = end_at ? new Date(end_at).getTime() : NaN;
  const startMs = new Date(start_at).getTime();
  if (!Number.isNaN(endMs)) return endMs > nowMs;
  return startMs > nowMs;
}

/**
 * Выезд уже закончился по времени (дата конца или начала без конца).
 * Совпадает с логикой «просрочено» на /booking для слотов без слотов — по туру.
 */
export function isTourInstanceTimeEnded(
  params: {
    session?: { start_at: string; end_at: string | null } | null;
    tourStart?: string | null;
    tourEnd?: string | null;
  },
  nowMs: number = Date.now()
): boolean {
  if (params.session?.start_at) {
    const endS = params.session.end_at ? new Date(params.session.end_at).getTime() : NaN;
    const startS = new Date(params.session.start_at).getTime();
    if (!Number.isNaN(endS)) return endS <= nowMs;
    return startS <= nowMs;
  }
  const endT = params.tourEnd ? new Date(params.tourEnd).getTime() : NaN;
  const startT = params.tourStart ? new Date(params.tourStart).getTime() : NaN;
  if (!Number.isNaN(endT)) return endT <= nowMs;
  if (!Number.isNaN(startT)) return startT <= nowMs;
  return false;
}
