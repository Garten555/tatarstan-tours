'use client';

import { useEffect } from 'react';

let lockCount = 0;
let savedOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount <= 0) {
    lockCount = 0;
    document.body.style.overflow = savedOverflow || '';
    return;
  }
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow || '';
    savedOverflow = '';
  }
}

/** Сброс блокировки (на случай «залипшего» overflow: hidden). */
export function resetBodyScrollLock() {
  lockCount = 0;
  savedOverflow = '';
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
}

/** Блокирует прокрутку `document.body`, пока открыта модалка/оверлей. Поддерживает вложенные модалки. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}
