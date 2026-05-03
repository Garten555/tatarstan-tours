import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { findAuthUserByEmail } from '@/lib/supabase/admin-users';
import { validateEmail, validatePersonName, normalizeAuthEmail } from '@/lib/validation/auth';

/** Полная регистрация только после шага с паролем (/register ставит app_metadata.registration_completed). Запись в Auth после OTP без этого флага — не считаем «уже зарегистрирован». */
function hasCompletedRegistrationInApp(user: { app_metadata?: object | null }): boolean {
  const app = user.app_metadata as Record<string, unknown> | undefined;
  return app?.registration_completed === true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body.email === 'string' ? body.email : '';
    const firstNameRaw = typeof body.firstName === 'string' ? body.firstName : '';

    const ev = validateEmail(emailRaw);
    if (!ev.valid) {
      return NextResponse.json({ error: ev.error }, { status: 400 });
    }

    const fn = validatePersonName(firstNameRaw, { required: true, label: 'Имя' });
    if (!fn.valid) {
      return NextResponse.json({ error: fn.error }, { status: 400 });
    }

    const normEmail = normalizeAuthEmail(emailRaw);
    const supabase = createServiceClient();

    try {
      const { user: existing, error: findErr } = await findAuthUserByEmail(supabase, normEmail);
      if (findErr) {
        console.error('[send-verification-code] findAuthUserByEmail:', findErr);
      } else if (existing && hasCompletedRegistrationInApp(existing)) {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже зарегистрирован' },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error('[send-verification-code] findAuthUserByEmail:', e);
    }

    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin || 'http://localhost:3000';

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteUrl}/auth/register`,
        data: {
          first_name: firstNameRaw.trim(),
        },
      },
    });

    if (otpError) {
      console.error('[send-verification-code] signInWithOtp:', otpError);
      const msg = (otpError.message || '').toLowerCase();
      const status = (otpError as { status?: number }).status;
      if (msg.includes('rate') || status === 429) {
        return NextResponse.json(
          {
            error: 'Слишком частые запросы. Подождите минуту и попробуйте снова.',
            retryAfterSeconds: 60,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error:
            otpError.message ||
            'Не удалось отправить письмо. Проверьте шаблоны и SMTP в Supabase (Authentication → Email).',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Код подтверждения отправлен на ваш email',
    });
  } catch (error: unknown) {
    console.error('Error in send verification code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось отправить код' },
      { status: 500 }
    );
  }
}
