'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Скрываем Header и Footer для админки, страницы обслуживания и страницы бана
  const isAdminRoute = pathname?.startsWith('/admin');
  const isMaintenanceRoute = pathname === '/maintenance';
  const isBannedRoute = pathname === '/banned';

  if (isAdminRoute || isMaintenanceRoute || isBannedRoute) {
    // Для админки и страницы бана только контент
    return <>{children}</>;
  }

  // Для обычных страниц - с Header и Footer
  return (
    <>
      <Header />
      <main className="main-with-sidebar">
        {children}
      </main>
      <Footer />
    </>
  );
}

