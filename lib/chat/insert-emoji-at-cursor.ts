import type { RefObject } from 'react';

/** Вставляет эмодзи в позицию каретки textarea или в конец строки. */
export function insertEmojiAtCursor(
  emoji: string,
  value: string,
  setValue: (next: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>
) {
  const el = textareaRef.current;
  if (!el) {
    setValue(value + emoji);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + emoji.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  });
}
