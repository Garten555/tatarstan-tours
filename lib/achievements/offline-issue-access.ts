/** Кто может выдавать офлайн-достижения в комнате тура. */
export function canIssueOfflineAchievements(role: string | null | undefined): boolean {
  return role === 'guide' || role === 'tour_admin' || role === 'super_admin';
}

/** tour_admin / super_admin — любая комната, без привязки к guide_id. */
export function canIssueOfflineAchievementsInAnyRoom(
  role: string | null | undefined
): boolean {
  return role === 'tour_admin' || role === 'super_admin';
}

/** Админ может выдать достижение без записи в tour_room_participants (создадим при выдаче). */
export function canBypassRoomParticipantCheck(
  role: string | null | undefined
): boolean {
  return role === 'tour_admin' || role === 'super_admin';
}
