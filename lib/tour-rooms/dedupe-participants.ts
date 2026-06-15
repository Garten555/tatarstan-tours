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

    const existingSynthetic = String(existing.id ?? '').startsWith('admin-viewer-');
    const rowSynthetic = String(row.id ?? '').startsWith('admin-viewer-');
    if (existingSynthetic && !rowSynthetic) {
      byUser.set(uid, row);
    }
  }

  return [...byUser.values()];
}
