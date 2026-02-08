'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Ban, AlertCircle } from 'lucide-react';

export default function BanBanner() {
  const [banInfo, setBanInfo] = useState<{
    is_banned: boolean;
    ban_reason: string | null;
    ban_until: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Не показываем баннер на странице /banned или в админке
    if (pathname === '/banned' || pathname?.startsWith('/admin')) {
      setLoading(false);
      return;
    }
    async function checkBan() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason, ban_until')
        .eq('id', user.id)
        .single();

      const profileData = profile as { is_banned?: boolean; ban_reason?: string | null; ban_until?: string | null } | null;
      
      if (profileData?.is_banned) {
        // Проверяем, не истёк ли срок бана
        if (profileData.ban_until) {
          const until = new Date(profileData.ban_until);
          if (until.getTime() <= Date.now()) {
            // Бан истёк - не показываем баннер
            setLoading(false);
            return;
          }
        }
        setBanInfo({
          is_banned: true,
          ban_reason: profileData.ban_reason || null,
          ban_until: profileData.ban_until || null,
        });
      }
      
      setLoading(false);
    }

    checkBan();
  }, [supabase]);

  useEffect(() => {
    // Если пользователь забанен, редиректим на /banned
    if (banInfo?.is_banned && pathname !== '/banned' && !pathname?.startsWith('/admin')) {
      window.location.href = '/banned';
    }
  }, [banInfo, pathname]);

  // Не показываем ничего, просто редиректим
  return null;
}

