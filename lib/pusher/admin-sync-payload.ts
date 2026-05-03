/** Общее для API (trigger) и клиента (subscribe): канал `admin-sync-${userId}`, событие `admin-sync`. */
export type AdminSyncPayload =
  | { kind: 'profile_role'; role: string | null }
  | {
      kind: 'guide_rooms';
      reason: 'reassigned' | 'removed' | 'room_deleted';
      roomId?: string;
    }
  | { kind: 'forced_reload'; reason: 'banned' | 'unban' };

export const ADMIN_SYNC_PUSHER_EVENT = 'admin-sync' as const;

export function adminSyncChannelName(userId: string): string {
  return `admin-sync-${userId}`;
}
