/**
 * Plyr иногда оставляет английские подписи в подменю скорости (заголовок «Speed», «Normal»),
 * хотя в опциях переданы русские строки. Принудительно выставляем текст в DOM после готовности
 * и после ratechange (там Plyr снова вызывает getLabel / innerHTML).
 */

export const PLYR_SPEED_RU = {
  speed: 'Скорость',
  normal: 'Обычная',
  menuBack: 'Назад к предыдущему меню',
} as const;

/** Минимальный контракт экземпляра Plyr для патча UI */
export type PlyrRussianUiHost = {
  id: number;
  ready: boolean;
  media: HTMLMediaElement;
  once: (event: string, fn: () => void) => void;
  on: (event: string, fn: () => void) => void;
  off?: (event: string, fn: () => void) => void;
  elements: {
    container: HTMLElement;
    settings?: {
      buttons?: Partial<Record<string, HTMLElement>>;
      panels?: Partial<Record<string, HTMLElement>>;
    };
  };
  config: {
    classNames: {
      menu: { value: string };
    };
  };
};

function patchSpeedSubpanel(player: PlyrRussianUiHost) {
  const panel = player.elements.settings?.panels?.speed;
  if (!panel) return;

  const back = panel.querySelector<HTMLElement>('.plyr__control--back');
  if (back) {
    const spans = back.querySelectorAll<HTMLElement>('span');
    if (spans[0]) spans[0].textContent = PLYR_SPEED_RU.speed;
    if (spans[1]) spans[1].textContent = PLYR_SPEED_RU.menuBack;
  }

  const menu = panel.querySelector('[role="menu"]');
  if (!menu) return;

  menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]').forEach((btn) => {
    const parsed = Number.parseFloat(btn.getAttribute('value') ?? '');
    const flex = btn.querySelector<HTMLElement>(':scope > span');
    if (!flex) return;
    const title = parsed === 1 ? PLYR_SPEED_RU.normal : `${parsed}&times;`;
    flex.innerHTML = title;
  });
}

function patchSpeedHomeRow(player: PlyrRussianUiHost) {
  const btn = player.elements.settings?.buttons?.speed;
  if (!btn) return;

  const flex = btn.querySelector<HTMLElement>(':scope > span');
  if (!flex) return;

  const rate = Number(player.media.playbackRate);
  const valueHtml = rate === 1 ? PLYR_SPEED_RU.normal : `${rate}&times;`;

  flex.replaceChildren();
  flex.appendChild(document.createTextNode(PLYR_SPEED_RU.speed));
  const valueSpan = document.createElement('span');
  valueSpan.className = player.config.classNames.menu.value;
  valueSpan.innerHTML = valueHtml;
  flex.appendChild(valueSpan);
}

export function bindPlyrRussianSpeedUi(player: PlyrRussianUiHost) {
  const run = () => {
    patchSpeedSubpanel(player);
    patchSpeedHomeRow(player);
  };

  const schedule = () => queueMicrotask(run);

  if (player.ready) schedule();
  else player.once('ready', schedule);

  const onRateChange = () => queueMicrotask(run);
  player.on('ratechange', onRateChange);
}
