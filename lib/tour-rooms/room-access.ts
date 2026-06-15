import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserGuidedSessionIdsForTour } from '@/lib/bookings/guide-own-tour';
import {
  getRelatedRoomIds,
  getRoomScope,
  userHasDepartureAccess,
} from '@/lib/tour-rooms/merged-room-participants';
import type { RoomScope } from '@/lib/tour-rooms/merged-room-participants';

const ADMIN_ROLES = new Set(['tour_admin', 'super_admin', 'support_admin']);

export function isTourRoomAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(role ?? '');
}

export type TourRoomAccess = {
  scope: RoomScope;
  isAdmin: boolean;
  isGuide: boolean;
  /** Участник выезда: запись в комнате, бронь или админ/гид */
  isParticipant: boolean;
};

async function isUserGuideForDeparture(
  serviceClient: SupabaseClient,
  userId: string,
  scope: RoomScope
): Promise<boolean> {
  if (scope.guide_id === userId) return true;

  const relatedRoomIds = await getRelatedRoomIds(serviceClient, scope);
  const { count: guideOnRelated } = await serviceClient
    .from('tour_rooms')
    .select('id', { count: 'exact', head: true })
    .in('id', relatedRoomIds)
    .eq('guide_id', userId);

  if ((guideOnRelated ?? 0) > 0) return true;

  if (scope.tour_session_id) {
    const guidedSessionIds = await getUserGuidedSessionIdsForTour(
      serviceClient,
      userId,
      scope.tour_id
    );
    if (guidedSessionIds.includes(scope.tour_session_id)) return true;
  }

  const { count: legacyGuideRooms } = await serviceClient
    .from('tour_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', scope.tour_id)
    .eq('guide_id', userId)
    .is('tour_session_id', null);

  return (legacyGuideRooms ?? 0) > 0;
}

/**
 * Доступ к комнате тура: админ, назначенный гид выезда, участник/бронь
 * (в т.ч. через duplicate-комнаты того же session_id).
 */
export async function getTourRoomAccess(
  serviceClient: SupabaseClient,
  roomId: string,
  userId: string,
  userRole: string | null | undefined
): Promise<TourRoomAccess | null> {
  const scope = await getRoomScope(serviceClient, roomId);
  if (!scope) return null;

  const isAdmin = isTourRoomAdminRole(userRole);
  if (isAdmin) {
    return {
      scope,
      isAdmin: true,
      isGuide: scope.guide_id === userId,
      isParticipant: true,
    };
  }

  const isGuide = await isUserGuideForDeparture(serviceClient, userId, scope);
  if (isGuide) {
    return { scope, isAdmin: false, isGuide: true, isParticipant: true };
  }

  const hasDepartureAccess = await userHasDepartureAccess(serviceClient, scope, userId);
  if (hasDepartureAccess) {
    return { scope, isAdmin: false, isGuide: false, isParticipant: true };
  }

  return { scope, isAdmin: false, isGuide: false, isParticipant: false };
}

export async function canAccessTourRoom(
  serviceClient: SupabaseClient,
  roomId: string,
  userId: string,
  userRole: string | null | undefined
): Promise<boolean> {
  const access = await getTourRoomAccess(serviceClient, roomId, userId, userRole);
  return Boolean(access?.isParticipant);
}

export type RequireTourRoomAccessResult =
  | { allowed: true; access: TourRoomAccess }
  | { allowed: false; status: 404 | 403; error: string };

/** Для API-маршрутов: 404 если комнаты нет, 403 если нет доступа. */
export async function requireTourRoomAccess(
  serviceClient: SupabaseClient,
  roomId: string,
  userId: string,
  userRole: string | null | undefined
): Promise<RequireTourRoomAccessResult> {
  const access = await getTourRoomAccess(serviceClient, roomId, userId, userRole);
  if (!access) {
    return { allowed: false, status: 404, error: 'Комната не найдена' };
  }
  if (!access.isParticipant) {
    return { allowed: false, status: 403, error: 'У вас нет доступа к этой комнате' };
  }
  return { allowed: true, access };
}
