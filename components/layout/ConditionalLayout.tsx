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
  
  // Скрываем Header и Footer для админки
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    // Для админки только контент (там свой layout с sidebar)
    return <>{children}</>;
  }

  // Для обычных страниц - с Header и Footer
  return (
    <>
      <Header />
      <main className="pt-20">
        {children}
      </main>
      <Footer />
    </>
  );
}

