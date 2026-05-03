import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Завершение сессии на сервере (очистка auth-cookies для middleware / RSC).
 * Клиентский signOut() без VPN может висеть — этот маршрут вызывается из меню «Выйти».
 */
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error('[api/auth/signout]', e);
  }
  return NextResponse.json({ ok: true });
}
