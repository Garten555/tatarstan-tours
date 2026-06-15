/** In-memory: кто сейчас смотрит комнату тура (PM2 / один процесс). TTL 45 с. */
const TTL_MS = 45_000;

type ViewingEntry = {
  roomIds: string[];
  updatedAt: number;
};

const viewingByUser = new Map<string, ViewingEntry>();

export function touchTourRoomViewing(userId: string, roomIds: string[]): void {
  if (!userId || roomIds.length === 0) return;
  viewingByUser.set(userId, {
    roomIds: [...new Set(roomIds.map(String))],
    updatedAt: Date.now(),
  });
}

export function clearTourRoomViewing(userId: string): void {
  viewingByUser.delete(userId);
}

export function isUserViewingTourDeparture(
  userId: string,
  roomIdsInDeparture: string[]
): boolean {
  const entry = viewingByUser.get(userId);
  if (!entry) return false;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    viewingByUser.delete(userId);
    return false;
  }
  const departure = new Set(roomIdsInDeparture.map(String));
  return entry.roomIds.some((id) => departure.has(id));
}

/** Периодическая очистка устаревших записей. */
export function pruneStaleTourRoomViewing(): void {
  const now = Date.now();
  for (const [uid, entry] of viewingByUser) {
    if (now - entry.updatedAt > TTL_MS) viewingByUser.delete(uid);
  }
}
