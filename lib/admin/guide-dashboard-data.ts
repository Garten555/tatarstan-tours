import type { SupabaseClient } from '@supabase/supabase-js';
import {
  roomTourLifecycle,
  type RoomTourLifecycle,
} from '@/lib/achievements/dedupe-award-rooms';
import {
  loadGuideTourRooms,
  type MappedGuideTourRoom,
} from '@/lib/admin/guide-tour-room-rows';
import {
  getTourRoomNotificationSummary,
  mapUnreadCountsToDisplayedRooms,
} from '@/lib/notifications/tour-room-notification-summary';

export type GuideDashboardStats = {
  totalRooms: number;
  activeRooms: number;
  upcomingRooms: number;
  completedRooms: number;
  totalParticipants: number;
  unreadMessages: number;
};

export type GuideDashboardRoom = MappedGuideTourRoom & {
  lifecycle: RoomTourLifecycle;
  unread_count: number;
};

export type GuideDashboardData = {
  stats: GuideDashboardStats;
  previewRooms: GuideDashboardRoom[];
  totalRooms: number;
};

const LIFECYCLE_SORT: Record<RoomTourLifecycle, number> = {
  ongoing: 0,
  upcoming: 1,
  ended: 2,
};

const PREVIEW_LIMIT = 6;

function sortRoomsForPreview(rooms: MappedGuideTourRoom[]): MappedGuideTourRoom[] {
  return [...rooms].sort((a, b) => {
    const la = LIFECYCLE_SORT[roomTourLifecycle(a)];
    const lb = LIFECYCLE_SORT[roomTourLifecycle(b)];
    if (la !== lb) return la - lb;

    const aStart = a.session_start_at
      ? new Date(a.session_start_at).getTime()
      : new Date(a.tour.start_date).getTime();
    const bStart = b.session_start_at
      ? new Date(b.session_start_at).getTime()
      : new Date(b.tour.start_date).getTime();

    if (la === LIFECYCLE_SORT.ended) return bStart - aStart;
    return aStart - bStart;
  });
}

export async function getGuideDashboardData(
  serviceClient: SupabaseClient,
  guideId: string
): Promise<GuideDashboardData> {
  const [rooms, notificationSummary] = await Promise.all([
    loadGuideTourRooms(serviceClient, {
      guideId,
      resolveCanonical: false,
      skipOrphanAssign: true,
    }),
    getTourRoomNotificationSummary(serviceClient, guideId),
  ]);

  const unreadByRoom = await mapUnreadCountsToDisplayedRooms(
    serviceClient,
    rooms.map((r) => ({ id: r.id, tour_session_id: r.tour_session_id })),
    notificationSummary.room_counts
  );

  const activeRooms = rooms.filter((r) => roomTourLifecycle(r) === 'ongoing');
  const upcomingRooms = rooms.filter((r) => roomTourLifecycle(r) === 'upcoming');
  const completedRooms = rooms.filter((r) => roomTourLifecycle(r) === 'ended');
  const totalParticipants = rooms.reduce((sum, r) => sum + (r.participants_count ?? 0), 0);

  const previewRooms = sortRoomsForPreview(rooms)
    .slice(0, PREVIEW_LIMIT)
    .map((room) => ({
      ...room,
      lifecycle: roomTourLifecycle(room),
      unread_count: unreadByRoom[room.id] ?? 0,
    }));

  return {
    stats: {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      upcomingRooms: upcomingRooms.length,
      completedRooms: completedRooms.length,
      totalParticipants,
      unreadMessages: notificationSummary.tour_room_message,
    },
    previewRooms,
    totalRooms: rooms.length,
  };
}
