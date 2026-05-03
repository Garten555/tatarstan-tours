import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateEmail, normalizeAuthEmail } from '@/lib/validation/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body.email === 'string' ? body.email : '';
    const codeRaw = typeof body.code === 'string' ? body.code : '';

    const ev = validateEmail(emailRaw);
    if (!ev.valid) {
      return NextResponse.json({ isValid: false, error: ev.error }, { status: 200 });
    }

    const normEmail = normalizeAuthEmail(emailRaw);
    const code = codeRaw.trim();

    if (!code) {
      return NextResponse.json({ isValid: false, error: 'Введите код из письма' }, { status: 200 });
    }

    const supabase = createServiceClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normEmail,
      token: code,
      type: 'email',
    });

    if (verifyError) {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Код неверен или истёк. Запросите новый код.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ isValid: true, email: normEmail }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error verifying email code:', error);
    return NextResponse.json(
      { isValid: false, error: 'Ошибка при проверке кода' },
      { status: 200 }
    );
  }
}
