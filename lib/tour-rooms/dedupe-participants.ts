type ParticipantLike = {
  id?: string;
  user_id: string;
};

/** Один участник на user_id; приоритет у реальной строки БД, не у admin-viewer. */
export function dedupeParticipantsByUserId<T extends ParticipantLike>(list: T[]): T[] {
  const byUser = new Map<string, T>();

  for (const row of list) {
    const uid = row.user_id;
    if (!uid) continue;

    const existing = byUser.get(uid);
    if (!existing) {
      byUser.set(uid, row);
      continue;
    }

    const existingSynthetic =
      String(existing.id ?? '').startsWith('admin-viewer-') ||
      String(existing.id ?? '').startsWith('booking-');
    const rowSynthetic =
      String(row.id ?? '').startsWith('admin-viewer-') ||
      String(row.id ?? '').startsWith('booking-');
    if (existingSynthetic && !rowSynthetic) {
      byUser.set(uid, row);
      continue;
    }
    if (!existingSynthetic && rowSynthetic) {
      continue;
    }

    const existingHasBooking = Boolean(
      (existing as { booking_id?: string | null }).booking_id
    );
    const rowHasBooking = Boolean((row as { booking_id?: string | null }).booking_id);
    if (!existingHasBooking && rowHasBooking) {
      byUser.set(uid, row);
    }
  }

  return [...byUser.values()];
}
