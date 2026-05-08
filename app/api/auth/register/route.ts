import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { findAuthUserByEmail } from '@/lib/supabase/admin-users';
import {
  validateEmail,
  validatePassword,
  validatePersonName,
  normalizeAuthEmail,
} from '@/lib/validation/auth';

function hasCompletedRegistrationInApp(user: { app_metadata?: object | null }): boolean {
  const app = user.app_metadata as Record<string, unknown> | undefined;
  return app?.registration_completed === true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName : '';
    const middleName =
      typeof body.middleName === 'string' && body.middleName.trim()
        ? body.middleName.trim()
        : null;

    const ev = validateEmail(email);
    if (!ev.valid) {
      return NextResponse.json({ error: ev.error }, { status: 400 });
    }

    const fn = validatePersonName(firstName, { required: true, label: 'Имя' });
    if (!fn.valid) return NextResponse.json({ error: fn.error }, { status: 400 });

    const ln = validatePersonName(lastName, { required: true, label: 'Фамилия' });
    if (!ln.valid) return NextResponse.json({ error: ln.error }, { status: 400 });

    if (middleName) {
      const mn = validatePersonName(middleName, { required: false, label: 'Отчество' });
      if (!mn.valid) return NextResponse.json({ error: mn.error }, { status: 400 });
    }

    const pv = validatePassword(password);
    if (!pv.valid) {
      return NextResponse.json({ error: pv.error || 'Некорректный пароль' }, { status: 400 });
    }

    const normEmail = normalizeAuthEmail(email);
    const supabase = createServiceClient();

    const { user: authUser, error: findErr } = await findAuthUserByEmail(supabase, normEmail);
    if (findErr) {
      console.error('[register] findAuthUserByEmail:', findErr);
      return NextResponse.json({ error: 'Не удалось проверить аккаунт' }, { status: 500 });
    }

    if (!authUser) {
      return NextResponse.json(
        {
          error:
            'Сначала подтвердите email кодом из письма. Если код уже использован — завершите регистрацию или запросите код снова.',
        },
        { status: 403 }
      );
    }

    if (hasCompletedRegistrationInApp(authUser)) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже зарегистрирован' },
        { status: 400 }
      );
    }

    const prevApp = (authUser.app_metadata || {}) as Record<string, unknown>;
    const prevMeta = (authUser.user_metadata || {}) as Record<string, unknown>;

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...prevMeta,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName,
      },
      app_metadata: {
        ...prevApp,
        registration_completed: true,
      },
    });

    if (updateError) {
      console.error('[register] updateUser:', updateError);
      return NextResponse.json(
        { error: 'Не удалось завершить регистрацию. Попробуйте позже.' },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    const profilePayload = {
      email: normEmail,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName,
      updated_at: nowIso,
    };

    const profileMutation = existingProfile
      ? supabase.from('profiles').update(profilePayload).eq('id', authUser.id)
      : supabase.from('profiles').insert({
          id: authUser.id,
          role: 'user',
          ...profilePayload,
        });

    const { error: profileErr } = await profileMutation;

    if (profileErr) {
      console.error('[register] profiles upsert:', profileErr);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authUser.id,
          email: normEmail,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in register:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при регистрации' },
      { status: 500 }
    );
  }
}
