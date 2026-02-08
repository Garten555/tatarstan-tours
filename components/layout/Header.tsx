'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import UserMenu from './UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { MapPin, Info, Phone, Menu, X } from 'lucide-react';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/tours', label: 'Туры', icon: MapPin },
    { href: '/about', label: 'О нас', icon: Info },
    { href: '/contacts', label: 'Контакты', icon: Phone },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 backdrop-blur-lg shadow-sm border-b border-gray-200'
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-20">
          {/* Левый блок: Логотип */}
          <Link 
            href="/" 
            className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 group flex-shrink-0 min-w-0"
          >
            <Logo className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 transition-transform duration-200 group-hover:scale-105 flex-shrink-0" />
            <span className="block text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors whitespace-nowrap truncate">
              <span className="hidden xs:inline">Татарстан тур</span>
              <span className="xs:hidden">Татарстан тур</span>
            </span>
          </Link>

          {/* Центральный блок: Навигация - стильные кнопки */}
          <nav className="header-nav hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              // Для /tours активной должна быть только точная страница, не подстраницы
              const isActive = link.href === '/tours' 
                ? pathname === link.href
                : pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`header-nav-link flex items-center gap-2 px-4 py-2 text-base font-semibold rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/50'
                  }`}
                  style={{
                    color: isActive ? 'rgb(5 150 105)' : 'rgb(55 65 81)'
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Правый блок: Уведомления + Аватар - компактно */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            {/* Уведомления */}
            <div className="hidden sm:block">
              <NotificationBell />
            </div>

            {/* Меню пользователя */}
            <div className="hidden lg:block">
              <UserMenu />
            </div>

            {/* Кнопка мобильного меню */}
            <button
              className="lg:hidden p-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Меню"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              {/* Уведомления для мобилки */}
              <div className="sm:hidden pb-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Уведомления</span>
                  <NotificationBell />
                </div>
              </div>

              {/* Навигация */}
              <nav className="header-nav space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  // Для /tours активной должна быть только точная страница, не подстраницы
                  const isActive = link.href === '/tours' 
                    ? pathname === link.href
                    : pathname === link.href || pathname?.startsWith(link.href + '/');
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`header-nav-link flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/50'
                      }`}
                      style={{
                        color: isActive ? 'rgb(5 150 105)' : 'rgb(55 65 81)'
                      }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Меню пользователя для мобилки */}
              <div className="pt-3 border-t border-gray-200">
                <UserMenu />
              </div>

              {/* Кнопка бронирования */}
              <Button
                href="/booking"
                variant="primary"
                className="w-full mt-3 text-base py-3 font-semibold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Забронировать тур
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

