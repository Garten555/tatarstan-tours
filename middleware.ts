// Middleware для защиты маршрутов
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Проверка аутентификации
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Защита админских маршрутов
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      // Перенаправление на логин
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Проверка роли пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // Маппинг маршрутов на требуемые роли
    const roleRequirements: Record<string, string[]> = {
      '/admin/super': ['super_admin'],
      '/admin/tours': ['tour_admin', 'super_admin'],
      '/admin/support': ['support_admin', 'super_admin'],
    };

    // Определение требуемых ролей для текущего маршрута
    const requiredRoles = Object.entries(roleRequirements).find(([path]) =>
      request.nextUrl.pathname.startsWith(path)
    )?.[1];

    // Проверка доступа
    if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Защита маршрутов профиля и бронирований
  if (
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/my-bookings')
  ) {
    if (!session) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/my-bookings/:path*',
  ],
};

