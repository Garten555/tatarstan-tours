/**
 * Plyr из npm-пакета (в бандле Next/Webpack), без внешнего CDN — обходит блокировки и ошибки загрузки скрипта.
 */
export type PlyrCtor = new (
  target: HTMLElement,
  options?: Record<string, unknown>
) => { destroy(): void };

let plyrCssPromise: Promise<void> | null = null;

function ensurePlyrCss(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!plyrCssPromise) {
    plyrCssPromise = import('plyr/dist/plyr.css').then(() => undefined);
  }
  return plyrCssPromise;
}

export async function loadPlyr(): Promise<PlyrCtor> {
  if (typeof window === 'undefined') {
    throw new Error('Plyr: только в браузере');
  }
  await ensurePlyrCss();
  const mod = await import('plyr');
  const Ctor = mod.default;
  if (!Ctor || typeof Ctor !== 'function') {
    throw new Error('Plyr: неверный экспорт модуля');
  }
  return Ctor as PlyrCtor;
}
