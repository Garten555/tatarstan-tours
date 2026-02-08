'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ScrollToAnchor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          // Учитываем отступ для фиксированного хедера
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      } else {
        // Если нет якоря, прокручиваем в начало
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // Увеличиваем задержку для полной загрузки контента
    const timer = setTimeout(scrollToHash, 300);

    // Также слушаем изменения hash (для случаев, когда hash меняется после загрузки)
    const handleHashChange = () => {
      setTimeout(scrollToHash, 100);
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [pathname, searchParams]);

  return null;
}


