const STORAGE_KEY = 'tt_viewing_tour_room_ids';

export function setViewingTourRoomIds(roomIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(roomIds.map(String))]));
  } catch {
    /* ignore */
  }
}

export function clearViewingTourRoomIds(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isViewingTourRoom(roomId: string | null | undefined): boolean {
  if (!roomId || typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(roomId);
  } catch {
    return false;
  }
}
