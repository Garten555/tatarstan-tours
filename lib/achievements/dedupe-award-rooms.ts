/** Строка комнаты для страницы выдачи достижений (до дедупликации). */
export type AwardRoomDedupeInput = {
  id: string;
  tour_id: string;
  tour_session_id?: string | null;
  is_active: boolean;
  created_at: string;
  participants_count: number;
};

/**
 * Одна комната на выезд (tour_session_id) или одна legacy-комната на tour_id.
 * При дублях в БД оставляем комнату с большим числом участников.
 */
export function dedupeAwardRooms<T extends AwardRoomDedupeInput>(rooms: T[]): T[] {
  const bestByKey = new Map<string, T>();

  for (const room of rooms) {
    const key = room.tour_session_id
      ? `session:${room.tour_session_id}`
      : `legacy:${room.tour_id}`;

    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, room);
      continue;
    }

    const rank = (r: T) => [
      r.participants_count,
      r.is_active ? 1 : 0,
      new Date(r.created_at).getTime(),
    ] as const;

    const a = rank(room);
    const b = rank(existing);
    if (
      a[0] > b[0] ||
      (a[0] === b[0] && a[1] > b[1]) ||
      (a[0] === b[0] && a[1] === b[1] && a[2] > b[2])
    ) {
      bestByKey.set(key, room);
    }
  }

  return [...bestByKey.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
