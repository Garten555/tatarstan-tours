/** Ключи sessionStorage для возврата в каталог с сохранением фильтров и прокрутки. */
export const TOURS_RETURN_URL_KEY = 'tours-return-url';
export const TOURS_SCROLL_TO_CATALOG_KEY = 'tours-scroll-to-catalog';
export const TOURS_CATALOG_SECTION_ID = 'tours-catalog';

export function saveToursCatalogReturnUrl() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOURS_RETURN_URL_KEY, window.location.href);
  sessionStorage.setItem(TOURS_SCROLL_TO_CATALOG_KEY, '1');
}

export function consumeToursCatalogScrollFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = sessionStorage.getItem(TOURS_SCROLL_TO_CATALOG_KEY) === '1';
  if (flag) sessionStorage.removeItem(TOURS_SCROLL_TO_CATALOG_KEY);
  return flag;
}

export function getToursCatalogBackHref(fallback = '/tours'): string {
  if (typeof window === 'undefined') return fallback;
  const saved = sessionStorage.getItem(TOURS_RETURN_URL_KEY);
  if (!saved) return fallback;
  try {
    const u = new URL(saved, window.location.origin);
    u.hash = TOURS_CATALOG_SECTION_ID;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}

export function scrollToToursCatalog(behavior: ScrollBehavior = 'smooth') {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(TOURS_CATALOG_SECTION_ID);
  if (el) {
    el.scrollIntoView({ behavior, block: 'start' });
    return;
  }
  window.scrollTo({ top: 0, behavior });
}
