/** Обходит кривой резолв npm `plyr` в webpack (native fallback с controls). Pin с версией из package.json. */
const PLYR_VERSION = '3.8.3';
const PLYR_SCRIPT_URL = `https://cdn.jsdelivr.net/npm/plyr@${PLYR_VERSION}/dist/plyr.min.js`;

export type PlyrGlobal = new (
  target: HTMLElement,
  options?: Record<string, unknown>
) => { destroy(): void };

declare global {
  interface Window {
    Plyr?: PlyrGlobal;
  }
}

let loadPromise: Promise<PlyrGlobal> | null = null;

export function loadPlyrFromCdn(): Promise<PlyrGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Plyr: только в браузере'));
  }
  if (window.Plyr) {
    return Promise.resolve(window.Plyr);
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-plyr-cdn]');
      const finish = () => {
        if (window.Plyr) {
          resolve(window.Plyr);
        } else {
          reject(new Error('Plyr: скрипт загрузился, но window.Plyr не появился'));
        }
      };

      if (existing) {
        if (window.Plyr) {
          finish();
          return;
        }
        existing.addEventListener('load', finish);
        existing.addEventListener('error', () => reject(new Error('Plyr: ошибка существующего script')));
        queueMicrotask(() => {
          if (window.Plyr) finish();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = PLYR_SCRIPT_URL;
      script.async = true;
      script.dataset.plyrCdn = '1';
      script.crossOrigin = 'anonymous';
      script.onload = () => finish();
      script.onerror = () => reject(new Error('Plyr: не удалось загрузить скрипт с CDN'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
