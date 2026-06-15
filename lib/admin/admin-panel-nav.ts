/** Ссылка и подпись пункта «админка» в пользовательском меню (не путать с «Мои комнаты»). */
export function userMenuAdminPanelLink(role: string | null | undefined): {
  href: string;
  label: string;
} {
  if (role === 'support_admin') {
    return { href: '/admin/moderator-dashboard', label: 'Панель модератора' };
  }
  if (role === 'guide') {
    return { href: '/admin/guide-dashboard', label: 'Панель гида' };
  }
  if (role === 'super_admin' || role === 'tour_admin') {
    return { href: '/admin', label: 'Админ-панель' };
  }
  return { href: '/admin', label: 'Админ-панель' };
}

export function userMenuShowsAdminPanel(
  role: string | null | undefined,
  hasGuideRooms: boolean
): boolean {
  return (
    role === 'super_admin' ||
    role === 'tour_admin' ||
    role === 'support_admin' ||
    role === 'guide' ||
    hasGuideRooms
  );
}
