import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteFileFromS3 } from '@/lib/s3/upload';
import { publishAdminSync } from '@/lib/pusher/user-notification';

export const TOUR_ROOM_RETENTION_DAYS = 14;

type TourRef = {
  end_date?: string | null;
  start_date?: string | null;
  status?: string | null;
};

type SessionRef = {
  end_at?: string | null;
  start_at?: string | null;
};

export type TourRoomCleanupRow = {
  id: string;
  tour_session_id?: string | null;
  guide_id?: string | null;
  tour?: TourRef | TourRef[] | null;
  session?: SessionRef | SessionRef[] | null;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Дата окончания комнаты: слот (end_at) → end_date тура → start_date завершённого тура. */
export function resolveTourRoomEndTimestamp(room: TourRoomCleanupRow): number | null {
  const session = unwrap(room.session);
  const tour = unwrap(room.tour);

  if (room.tour_session_id) {
    if (session?.end_at) {
      const ts = new Date(session.end_at).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    if (session?.start_at) {
      const ts = new Date(session.start_at).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
  }

  if (tour?.end_date) {
    const ts = new Date(tour.end_date).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  if (
    tour?.start_date &&
    (tour.status === 'completed' || tour.status === 'cancelled')
  ) {
    const ts = new Date(tour.start_date).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  return null;
}

export function isTourRoomExpired(
  room: TourRoomCleanupRow,
  retentionDays = TOUR_ROOM_RETENTION_DAYS,
  nowMs = Date.now()
): boolean {
  const endTs = resolveTourRoomEndTimestamp(room);
  if (endTs == null) return false;
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return nowMs - endTs >= retentionMs;
}

const ROOMS_SELECT = `
  id,
  tour_session_id,
  guide_id,
  tour:tours(
    id,
    end_date,
    start_date,
    status
  ),
  session:tour_sessions(
    end_at,
    start_at
  )
`;

export async function fetchAllTourRoomsForCleanup(
  serviceClient: SupabaseClient
): Promise<TourRoomCleanupRow[]> {
  const { data, error } = await serviceClient
    .from('tour_rooms')
    .select(ROOMS_SELECT);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TourRoomCleanupRow[];
}

export async function collectTourRoomS3Paths(
  serviceClient: SupabaseClient,
  roomIds: string[]
): Promise<string[]> {
  if (roomIds.length === 0) return [];

  const paths = new Set<string>();

  const [{ data: media }, { data: messages }] = await Promise.all([
    serviceClient
      .from('tour_room_media')
      .select('media_path')
      .in('room_id', roomIds),
    serviceClient
      .from('tour_room_messages')
      .select('image_path')
      .in('room_id', roomIds)
      .not('image_path', 'is', null),
  ]);

  for (const row of media ?? []) {
    const path = (row as { media_path?: string | null }).media_path;
    if (path) paths.add(path);
  }

  for (const row of messages ?? []) {
    const path = (row as { image_path?: string | null }).image_path;
    if (path) paths.add(path);
  }

  return [...paths];
}

export async function deleteS3Paths(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;

  await Promise.all(
    paths.map((path) =>
      deleteFileFromS3(path).catch((err) => {
        console.warn(`Failed to delete S3 object ${path}:`, err);
        return null;
      })
    )
  );

  return paths.length;
}

export async function deleteTourRoomsWithMedia(
  serviceClient: SupabaseClient,
  rooms: TourRoomCleanupRow[]
): Promise<{ deleted: number; s3Files: number }> {
  const roomIds = rooms.map((r) => r.id).filter(Boolean);
  if (roomIds.length === 0) {
    return { deleted: 0, s3Files: 0 };
  }

  const s3Paths = await collectTourRoomS3Paths(serviceClient, roomIds);
  const s3Files = await deleteS3Paths(s3Paths);

  const guideIds = [
    ...new Set(
      rooms
        .map((r) => r.guide_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const { error: deleteError } = await serviceClient
    .from('tour_rooms')
    .delete()
    .in('id', roomIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await Promise.all(
    guideIds.map((guideId) =>
      publishAdminSync(guideId, {
        kind: 'guide_rooms',
        reason: 'room_deleted',
      }).catch(() => null)
    )
  );

  return { deleted: roomIds.length, s3Files };
}

export async function cleanupExpiredTourRooms(
  serviceClient: SupabaseClient,
  retentionDays = TOUR_ROOM_RETENTION_DAYS
): Promise<{ deleted: number; s3Files: number }> {
  const rooms = await fetchAllTourRoomsForCleanup(serviceClient);
  const expired = rooms.filter((room) => isTourRoomExpired(room, retentionDays));
  return deleteTourRoomsWithMedia(serviceClient, expired);
}

export async function deleteAllTourRooms(
  serviceClient: SupabaseClient
): Promise<{ deleted: number; s3Files: number }> {
  const rooms = await fetchAllTourRoomsForCleanup(serviceClient);
  return deleteTourRoomsWithMedia(serviceClient, rooms);
}
