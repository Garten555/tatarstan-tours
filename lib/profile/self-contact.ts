import type { User as SupabaseUser } from '@supabase/supabase-js';

import { normalizeProfilePhoneForForm } from '@/lib/phone/format-ru-phone';

type ProfileLike = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
} | null | undefined;

/** ФИО, email и телефон текущего пользователя для бронирования «Я». */
export function resolveSelfContact(profile: ProfileLike, user: SupabaseUser) {
  const full_name =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile?.email || user.email || '';

  const email = profile?.email || user.email || null;
  const rawPhone = profile?.phone || user.phone || null;
  const phone = normalizeProfilePhoneForForm(rawPhone);

  return { full_name, email, phone };
}
