/** Пересечение двух интервалов [start, end). end может быть null → считаем +3ч. */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function sessionEndMs(startMs: number, endAt: string | null, fallbackMinutes: number): number {
  if (endAt) {
    const end = new Date(endAt).getTime();
    if (!Number.isNaN(end) && end > startMs) return end;
  }
  return startMs + fallbackMinutes * 60_000;
}

export function sameInstant(a: string, b: string, toleranceMs = 60_000): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return Math.abs(ta - tb) <= toleranceMs;
}
