// Admin middleware - проверка прав доступа к админке
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Роли с доступом к админке
const ADMIN_ROLES = ['super_admin', 'tour_admin', 'support_admin'];

export async function adminMiddleware(request: NextRequest) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Проверяем авторизацию
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Не авторизован - редирект на /auth
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Получаем роль пользователя из profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'user';

  // Проверяем права доступа
  if (!ADMIN_ROLES.includes(userRole)) {
    // Нет прав - редирект на главную
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Всё ОК - пропускаем дальше
  return NextResponse.next();
}

