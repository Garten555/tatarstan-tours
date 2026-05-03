'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { MessageCircle, Loader2 } from 'lucide-react';

const SupportChatLazy = dynamic(() => import('@/components/chat/SupportChat'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[260px] w-full sm:w-[min(100vw-2rem,420px)] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 p-8 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden />
      <span className="text-sm font-medium text-gray-600">Загрузка чата…</span>
    </div>
  ),
});

export default function SupportChatLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const prefetchChatModule = useCallback(() => {
    void import('@/components/chat/SupportChat');
  }, []);
  
  // Закрытие чата при клике на пользовательское меню или другие элементы
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Проверяем, не кликнули ли на сам чат или кнопку чата
      const chatContainer = target.closest('[data-support-chat]');
      const chatButton = target.closest('[data-support-chat-button]');
      
      // Проверяем, кликнули ли на пользовательское меню
      const userMenuButton = target.closest('[data-user-menu-button]');
      const userMenuDropdown = target.closest('[data-user-menu]');
      
      // Если кликнули на пользовательское меню или его элементы - закрываем чат
      if (userMenuButton || userMenuDropdown) {
        setOpen(false);
        return;
      }
      
      // Если кликнули вне чата (но не на кнопку чата) - закрываем чат
      if (!chatContainer && !chatButton) {
        setOpen(false);
      }
    };

    // Небольшая задержка, чтобы не закрывать сразу при открытии
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Скрываем чат в админ панели (после всех хуков)
  const isAdminRoute = pathname?.startsWith('/admin');
  const isTourRoomRoute = pathname?.startsWith('/tour-rooms');

  if (isAdminRoute || isTourRoomRoute) {
    return null;
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 sm:inset-auto sm:bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:right-[max(0.75rem,env(safe-area-inset-right,0px))]"
          data-support-chat
        >
          <div className="relative w-full h-full sm:w-auto sm:h-auto">
            <SupportChatLazy variant="widget" onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          data-support-chat-button
          onClick={() => setOpen(true)}
          onMouseEnter={prefetchChatModule}
          onFocus={prefetchChatModule}
          className="fixed z-50 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer safe-area-inset-bottom bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:right-[max(1.25rem,env(safe-area-inset-right,0px))]"
          aria-label="Чат поддержки и ИИ"
        >
          <MessageCircle className="w-6 h-6 sm:w-6 sm:h-6" />
        </button>
      )}
    </>
  );
}

