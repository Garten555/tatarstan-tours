/** Сброс inline-стилей прокрутки после выхода из админки (client navigation). */
export function resetDocumentScroll() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;
  html.style.removeProperty('overflow');
  html.style.removeProperty('height');
  body.style.removeProperty('overflow');
  body.style.removeProperty('height');
  window.scrollTo(0, 0);
}
