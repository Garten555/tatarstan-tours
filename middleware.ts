// Middleware для защиты маршрутов
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { validateApiMutationOrigin } from '@/lib/security/csrf';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /** Никогда не гоняем Supabase через middleware для статики Next — только лишняя работа и риск поломок чанков. */
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const csrfReason = validateApiMutationOrigin(request);
    if (csrfReason) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  }

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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      },
    }
  );

  // Проверка аутентификации (используем getUser() для безопасности)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  /** Уже проверили бан (чтобы не дублировать запрос к profiles для /profile и /my-bookings). */
  let banCheckDone = false;

  // Защита админских маршрутов
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (authError || !user) {
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

      banCheckDone = true;

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
    !banCheckDone &&
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

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/my-bookings/:path*',
    '/messenger/:path*',
    '/banned',
    // Исключаем публичные маршруты
    '/((?!api|_next/|favicon.ico|auth|terms|privacy|contacts|about|tours|$).*)',
  ],
};

