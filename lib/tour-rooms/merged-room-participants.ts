import type { SupabaseClient } from '@supabase/supabase-js';
import { dedupeParticipantsByUserId } from '@/lib/tour-rooms/dedupe-participants';

const PARTICIPANT_SELECT = `
  id,
  room_id,
  user_id,
  booking_id,
  joined_at,
  user:profiles(id, first_name, last_name, avatar_url, email, role),
  booking:bookings(id, num_people, status)
`;

type RoomScope = {
  id: string;
  tour_id: string;
  tour_session_id: string | null;
  guide_id: string | null;
};

export type { RoomScope };

export async function getRoomScope(
  serviceClient: SupabaseClient,
  roomId: string
): Promise<RoomScope | null> {
  const { data, error } = await serviceClient
    .from('tour_rooms')
    .select('id, tour_id, tour_session_id, guide_id')
    .eq('id', roomId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[room-participants] scope:', error.message);
    return null;
  }

  return {
    id: String(data.id),
    tour_id: String((data as { tour_id: string }).tour_id),
    tour_session_id: (data as { tour_session_id?: string | null }).tour_session_id
      ? String((data as { tour_session_id: string }).tour_session_id)
      : null,
    guide_id: (data as { guide_id?: string | null }).guide_id
      ? String((data as { guide_id: string }).guide_id)
      : null,
  };
}

/** Все комнаты того же выезда (дубли в БД с одним session_id или legacy tour). */
export async function getRelatedRoomIds(
  serviceClient: SupabaseClient,
  scope: RoomScope
): Promise<string[]> {
  if (scope.tour_session_id) {
    const { data } = await serviceClient
      .from('tour_rooms')
      .select('id')
      .eq('tour_session_id', scope.tour_session_id);
    const ids = (data ?? []).map((r) => String((r as { id: string }).id));
    return ids.length > 0 ? ids : [scope.id];
  }

  const { data } = await serviceClient
    .from('tour_rooms')
    .select('id')
    .eq('tour_id', scope.tour_id)
    .is('tour_session_id', null);

  const ids = (data ?? []).map((r) => String((r as { id: string }).id));
  return ids.length > 0 ? ids : [scope.id];
}

type ParticipantRow = {
  id: string;
  room_id: string;
  user_id: string;
  booking_id: string | null;
  joined_at: string;
  user?: unknown;
  booking?: unknown;
};

/** Брони на этот выезд — участники могли попасть в другую duplicate-комнату. */
async function fetchBookingParticipantRows(
  serviceClient: SupabaseClient,
  scope: RoomScope,
  roomIdForSynthetic: string
): Promise<ParticipantRow[]> {
  let query = serviceClient
    .from('bookings')
    .select(`
      id,
      user_id,
      num_people,
      status,
      booking_date,
      user:profiles(id, first_name, last_name, avatar_url, email, role)
    `)
    .eq('tour_id', scope.tour_id)
    .in('status', ['pending', 'confirmed', 'completed']);

  if (scope.tour_session_id) {
    query = query.eq('session_id', scope.tour_session_id);
  } else {
    query = query.is('session_id', null);
  }

  const { data, error } = await query.limit(100);
  if (error) {
    console.error('[room-participants] bookings:', error.message);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const record = row as {
      id: string;
      user_id: string;
      num_people?: number;
      status?: string;
      booking_date?: string;
      user?: ParticipantRow['user'];
    };
    if (!record.user_id) return [];

    return [
      {
        id: `booking-${record.id}`,
        room_id: roomIdForSynthetic,
        user_id: record.user_id,
        booking_id: record.id,
        joined_at: record.booking_date ?? new Date().toISOString(),
        user: record.user,
        booking: {
          id: record.id,
          num_people: record.num_people ?? 1,
          status: record.status ?? 'confirmed',
        },
      },
    ];
  });
}

export async function fetchMergedRoomParticipants(
  serviceClient: SupabaseClient,
  roomId: string
): Promise<{ scope: RoomScope | null; participants: ParticipantRow[]; roomIds: string[] }> {
  const scope = await getRoomScope(serviceClient, roomId);
  if (!scope) {
    return { scope: null, participants: [], roomIds: [roomId] };
  }

  const roomIds = await getRelatedRoomIds(serviceClient, scope);

  const { data: fromRooms, error } = await serviceClient
    .from('tour_room_participants')
    .select(PARTICIPANT_SELECT)
    .in('room_id', roomIds)
    .order('joined_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[room-participants] load:', error.message);
  }

  const fromBookings = await fetchBookingParticipantRows(serviceClient, scope, scope.id);
  const merged = dedupeParticipantsByUserId([
    ...((fromRooms ?? []) as ParticipantRow[]),
    ...fromBookings,
  ]);

  return { scope, participants: merged, roomIds };
}

export async function userHasDepartureAccess(
  serviceClient: SupabaseClient,
  scope: RoomScope,
  userId: string
): Promise<boolean> {
  const roomIds = await getRelatedRoomIds(serviceClient, scope);

  const { count: inRoom } = await serviceClient
    .from('tour_room_participants')
    .select('id', { count: 'exact', head: true })
    .in('room_id', roomIds)
    .eq('user_id', userId);

  if ((inRoom ?? 0) > 0) return true;

  let bookingQuery = serviceClient
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', scope.tour_id)
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed', 'completed']);

  if (scope.tour_session_id) {
    bookingQuery = bookingQuery.eq('session_id', scope.tour_session_id);
  } else {
    bookingQuery = bookingQuery.is('session_id', null);
  }

  const { count: booked } = await bookingQuery;
  return (booked ?? 0) > 0;
}
