'use client';

import { useEffect } from 'react';
import { resetDocumentScroll } from '@/lib/dom/reset-document-scroll';

/** Блокирует прокрутку документа в админке; при уходе на главную — снимает блокировку. */
export default function AdminBodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.height = '100%';

    return () => {
      resetDocumentScroll();
    };
  }, []);

  return null;
}
