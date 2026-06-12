'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { resetDocumentScroll } from '@/lib/dom/reset-document-scroll';

/** После client-перехода с /admin на публичные страницы восстанавливает прокрутку и hero. */
export default function DocumentScrollReset() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;
    resetDocumentScroll();
  }, [isAdminRoute, pathname]);

  return null;
}
