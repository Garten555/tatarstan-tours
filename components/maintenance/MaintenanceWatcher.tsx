'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type MaintenanceStatus = {
  enabled: boolean;
};

const ADMIN_ROLES = new Set(['super_admin', 'tour_admin', 'support_admin']);

export default function MaintenanceWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const checkMaintenance = async () => {
      if (!active) return;
      
      try {
        const response = await fetch('/api/maintenance/status', { 
          cache: 'no-store',
          signal: AbortSignal.timeout(5000) // Таймаут 5 секунд
        });
        
        if (!response.ok) {
          return; // Игнорируем ошибки HTTP
        }
        
        const data = (await response.json()) as MaintenanceStatus;

        if (!active || !data?.enabled) {
          return;
        }

        if (pathname.startsWith('/maintenance')) {
          return;
        }

        let isAdmin = false;

        try {
          const profileResponse = await fetch('/api/profile', { cache: 'no-store' });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const role = profileData?.profile?.role;
            isAdmin = ADMIN_ROLES.has(role);
          }
        } catch {
          // Ignore profile check errors
        }

        if (!isAdmin) {
          window.location.href = '/maintenance';
        }
      } catch {
        // Ignore fetch errors
      }
    };

    checkMaintenance();
    timer = setInterval(checkMaintenance, 5000);

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [pathname]);

  return null;
}

