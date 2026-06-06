import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteFileFromS3 } from '@/lib/s3/upload';
import { publishAdminSync } from '@/lib/pusher/user-notification';
import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';
import { completeFinishedActiveTours } from '@/lib/tours/tour-lifecycle-status';
import { hasScheduledFutureStart } from '@/lib/tours/tour-public-visibility';

export const TOUR_ROOM_RETENTION_DAYS = 14;

type TourRef = {
  end_date?: string | null;
  start_date?: string | null;
  status?: string | null;
};

type SessionRef = {
  id?: string;
  start_at?: string | null;
  end_at?: string | null;
  status?: string | null;
};

export type TourRoomCleanupRow = {
  id: string;
  tour_id: string;
  tour_session_id?: string | null;
  guide_id?: string | null;
  tour?: TourRef | TourRef[] | null;
  session?: SessionRef | SessionRef[] | null;
  /** Все слоты тура — для «общих» комнат без tour_session_id */
  tourSessions?: SessionRef[];
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseTs(value?: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function sessionEndTs(session: SessionRef): number | null {
  return parseTs(session.end_at) ?? parseTs(session.start_at);
}

/**
 * Дата окончания комнаты для retention:
 * - комната слота → только end_at/start_at этого слота (не end_date тура);
 * - общая комната → все слоты тура прошли → max(end слотов); иначе прошлый end_date/start_date тура.
 */
export function resolveTourRoomEndTimestamp(
  room: TourRoomCleanupRow,
  nowMs = Date.now()
): number | null {
  const session = unwrap(room.session);
  const tour = unwrap(room.tour);

  if (room.tour_session_id) {
    const slotEnd = session ? sessionEndTs(session) : null;
    if (slotEnd != null) return slotEnd;
    return null;
  }

  const sessions = (room.tourSessions ?? []).filter(
    (s) => s.id && s.id !== LEGACY_TOUR_SESSION_ID
  );

  if (sessions.length > 0) {
    const hasUpcoming = sessions.some((s) => {
      const start = parseTs(s.start_at);
      return start != null && start > nowMs;
    });
    if (hasUpcoming) return null;

    const ends = sessions
      .map(sessionEndTs)
      .filter((ts): ts is number => ts != null);
    if (ends.length > 0) return Math.max(...ends);
  }

  if (tour && hasScheduledFutureStart(tour, new Date(nowMs))) {
    return null;
  }

  if (tour?.end_date) {
    const ts = parseTs(tour.end_date);
    if (ts != null && ts <= nowMs) return ts;
  }
  if (tour?.start_date) {
    const ts = parseTs(tour.start_date);
    if (ts != null && ts <= nowMs) return ts;
  }

  if (tour?.status === 'completed' || tour?.status === 'cancelled') {
    return parseTs(tour.end_date) ?? parseTs(tour.start_date);
  }

  return null;
}

export function isTourRoomExpired(
  room: TourRoomCleanupRow,
  retentionDays = TOUR_ROOM_RETENTION_DAYS,
  nowMs = Date.now()
): boolean {
  const endTs = resolveTourRoomEndTimestamp(room, nowMs);
  if (endTs == null) return false;
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return nowMs - endTs >= retentionMs;
}

const ROOMS_SELECT = `
  id,
  tour_id,
  tour_session_id,
  guide_id,
  tour:tours(
    id,
    end_date,
    start_date,
    status
  ),
  session:tour_sessions!tour_rooms_tour_session_id_fkey(
    id,
    end_at,
    start_at,
    status
  )
`;

async function attachSessionData(
  serviceClient: SupabaseClient,
  rooms: TourRoomCleanupRow[]
): Promise<TourRoomCleanupRow[]> {
  if (rooms.length === 0) return rooms;

  const sessionIds = [
    ...new Set(
      rooms
        .map((r) => r.tour_session_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const sessionById = new Map<string, SessionRef>();

  if (sessionIds.length > 0) {
    const { data: slotRows, error } = await serviceClient
      .from('tour_sessions')
      .select('id, start_at, end_at, status')
      .in('id', sessionIds);

    if (error) {
      console.error('[tour-rooms cleanup] tour_sessions by id:', error);
    } else {
      for (const row of slotRows ?? []) {
        sessionById.set((row as { id: string }).id, row as SessionRef);
      }
    }
  }

  const legacyTourIds = [
    ...new Set(
      rooms
        .filter((r) => !r.tour_session_id)
        .map((r) => r.tour_id)
        .filter(Boolean)
    ),
  ];

  const sessionsByTourId = new Map<string, SessionRef[]>();

  if (legacyTourIds.length > 0) {
    const { data: tourSessionRows, error } = await serviceClient
      .from('tour_sessions')
      .select('id, tour_id, start_at, end_at, status')
      .in('tour_id', legacyTourIds);

    if (error) {
      console.error('[tour-rooms cleanup] tour_sessions by tour_id:', error);
    } else {
      for (const row of tourSessionRows ?? []) {
        const typed = row as SessionRef & { tour_id: string };
        const list = sessionsByTourId.get(typed.tour_id) ?? [];
        list.push(typed);
        sessionsByTourId.set(typed.tour_id, list);
      }
    }
  }

  return rooms.map((room) => {
    const embedded = unwrap(room.session);
    const fromBatch =
      room.tour_session_id != null
        ? sessionById.get(room.tour_session_id) ?? embedded
        : embedded;

    return {
      ...room,
      session: fromBatch ?? room.session,
      tourSessions: room.tour_session_id
        ? undefined
        : sessionsByTourId.get(room.tour_id) ?? [],
    };
  });
}

export async function fetchAllTourRoomsForCleanup(
  serviceClient: SupabaseClient
): Promise<TourRoomCleanupRow[]> {
  const { data, error } = await serviceClient
    .from('tour_rooms')
    .select(ROOMS_SELECT);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as TourRoomCleanupRow[];
  return attachSessionData(serviceClient, rows);
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

export type CleanupExpiredResult = {
  deleted: number;
  s3Files: number;
  totalRooms: number;
  expiredCount: number;
  activeCount: number;
};

export async function cleanupExpiredTourRooms(
  serviceClient: SupabaseClient,
  retentionDays = TOUR_ROOM_RETENTION_DAYS
): Promise<CleanupExpiredResult> {
  await completeFinishedActiveTours(serviceClient);

  const rooms = await fetchAllTourRoomsForCleanup(serviceClient);
  const expired = rooms.filter((room) => isTourRoomExpired(room, retentionDays));
  const { deleted, s3Files } = await deleteTourRoomsWithMedia(
    serviceClient,
    expired
  );

  return {
    deleted,
    s3Files,
    totalRooms: rooms.length,
    expiredCount: expired.length,
    activeCount: rooms.length - expired.length,
  };
}

export async function deleteAllTourRooms(
  serviceClient: SupabaseClient
): Promise<{ deleted: number; s3Files: number }> {
  const rooms = await fetchAllTourRoomsForCleanup(serviceClient);
  return deleteTourRoomsWithMedia(serviceClient, rooms);
}
