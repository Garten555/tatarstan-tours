'use client';

import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import type { EmojiClickData } from 'emoji-picker-react';
import type { EmojiData } from 'emoji-picker-react/dist/types/exposedTypes';

const EmojiPicker = dynamic(
  () =>
    Promise.all([
      import('emoji-picker-react'),
      import('emoji-picker-react/dist/data/emojis-ru.js'),
    ]).then(([mod, ruMod]) => {
      const Picker = mod.default;
      const emojiData = (ruMod as { default: EmojiData }).default;
      const Theme = mod.Theme;

      function PickerRu(props: {
        onEmojiClick: (data: EmojiClickData, e: MouseEvent) => void;
        width?: number | string;
        height?: number | string;
      }) {
        return (
          <Picker
            {...props}
            emojiData={emojiData}
            theme={Theme.LIGHT}
            lazyLoadEmojis
            searchPlaceholder="Поиск"
            searchClearButtonLabel="Очистить"
            previewConfig={{
              defaultCaption: 'Выберите эмодзи',
            }}
          />
        );
      }
      return PickerRu;
    }),
  { ssr: false }
);

type ChatEmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Класс для кнопки-смайла */
  buttonClassName?: string;
};

const PICKER_MAX_W = 352;
const PICKER_MAX_H = 380;

function computePanelRect(btn: HTMLButtonElement) {
  const rect = btn.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 10;
  const w = Math.min(PICKER_MAX_W, vw - pad * 2);
  const h = Math.min(PICKER_MAX_H, vh - pad * 2);

  let top = rect.top - h - 8;
  if (top < pad) {
    top = rect.bottom + 8;
  }
  if (top + h > vh - pad) {
    top = Math.max(pad, vh - h - pad);
  }

  let left = rect.right - w;
  if (left < pad) left = pad;
  if (left + w > vw - pad) left = vw - w - pad;

  return { top, left, width: w, height: h };
}

export function ChatEmojiPicker({
  onEmojiSelect,
  disabled,
  buttonClassName,
}: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    const btn = btnRef.current;
    if (!btn) return;

    const update = () => setPanelRect(computePanelRect(btn));

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const picker =
    open &&
    panelRect &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={panelRef}
        data-emoji-picker-panel
        className="fixed z-[400] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        style={{
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
          height: panelRect.height,
        }}
      >
        <EmojiPicker
          width={panelRect.width}
          height={panelRect.height}
          onEmojiClick={(emojiData: EmojiClickData) => {
            onEmojiSelect(emojiData.emoji);
            setOpen(false);
          }}
        />
      </div>,
      document.body
    );

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={
          buttonClassName ??
          'flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50'
        }
        title="Эмодзи"
        aria-label="Открыть палитру эмодзи"
        aria-expanded={open}
      >
        <Smile className="h-5 w-5" />
      </button>
      {picker}
    </div>
  );
}
