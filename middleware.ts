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

  // Проверка аутентификации (используем getUser() для безопасности)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Логирование для отладки (только в development)
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/admin')) {
    console.log('[Middleware] Admin route check:', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      cookies: request.cookies.getAll().map(c => c.name)
    });
  }

  // Защита админских маршрутов
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Проверяем только наличие пользователя (не проверяем authError, так как он может быть даже при валидной сессии)
    if (!user) {
      // Перенаправление на логин
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Проверка роли пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
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
    if (authError || !user) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Проверка бана пользователя (кроме страницы /banned)
    if (request.nextUrl.pathname !== '/banned') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, ban_until')
        .eq('id', user.id)
        .single();

      if (profile?.is_banned) {
        // Проверяем, не истёк ли срок бана
        if (profile.ban_until) {
          const until = new Date(profile.ban_until);
          if (until.getTime() > Date.now()) {
            // Бан ещё действует - редирект на страницу бана
            return NextResponse.redirect(new URL('/banned', request.url));
          }
        } else {
          // Постоянный бан - редирект на страницу бана
          return NextResponse.redirect(new URL('/banned', request.url));
        }
      }
    }
  }

  // Проверка бана для всех защищённых маршрутов (кроме /banned и /auth)
  if (
    user &&
    !request.nextUrl.pathname.startsWith('/banned') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api')
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, ban_until')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      // Проверяем, не истёк ли срок бана
      if (profile.ban_until) {
        const until = new Date(profile.ban_until);
        if (until.getTime() > Date.now()) {
          // Бан ещё действует - редирект на страницу бана
          return NextResponse.redirect(new URL('/banned', request.url));
        }
      } else {
        // Постоянный бан - редирект на страницу бана
        return NextResponse.redirect(new URL('/banned', request.url));
      }
    }
  }

  // Добавляем заголовки безопасности для защиты от XSS
  // CSP устанавливается в next.config.ts для всех маршрутов, чтобы избежать конфликтов
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/my-bookings/:path*',
    '/messenger/:path*',
    '/banned',
    // Исключаем публичные маршруты
    '/((?!api|_next/static|_next/image|favicon.ico|auth|terms|privacy|contacts|about|tours|$).*)',
  ],
};

