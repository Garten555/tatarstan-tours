import { sessionEndMs } from '@/lib/tour/schedule-slot';

export type SessionTimePhase = 'upcoming' | 'ongoing' | 'ended';

export function getSessionTimePhase(
  startAt: string,
  endAt: string | null,
  nowMs: number = Date.now(),
  durationFallbackMinutes = 180
): SessionTimePhase {
  const startMs = new Date(startAt).getTime();
  if (Number.isNaN(startMs)) return 'ended';

  const endMs = sessionEndMs(startMs, endAt, durationFallbackMinutes);
  if (nowMs >= endMs) return 'ended';
  if (nowMs >= startMs) return 'ongoing';
  return 'upcoming';
}

export const SESSION_TIME_PHASE_LABEL: Record<SessionTimePhase, string> = {
  upcoming: 'Предстоит',
  ongoing: 'Идёт сейчас',
  ended: 'Завершён',
};
