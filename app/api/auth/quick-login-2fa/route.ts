import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code || !code.trim()) {
      return NextResponse.json(
        { error: 'Email и код обязательны' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Находим пользователя
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      );
    }

    // Получаем данные MFA
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .maybeSingle();

    if (mfaError || !mfaData) {
      return NextResponse.json(
        { error: '2FA не включена для этого аккаунта. Используйте обычный вход с паролем.' },
        { status: 400 }
      );
    }

    // Проверяем блокировку
    if (mfaData.locked_until && new Date(mfaData.locked_until) > new Date()) {
      const lockedUntil = new Date(mfaData.locked_until);
      const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { 
          error: `Аккаунт временно заблокирован. Попробуйте через ${minutesLeft} минут.`,
          locked: true,
        },
        { status: 423 }
      );
    }

    // Проверяем код (TOTP или резервный)
    let isValid = false;
    let usedBackupCode = false;

    if (mfaData.backup_codes && Array.isArray(mfaData.backup_codes)) {
      const codeIndex = mfaData.backup_codes.indexOf(code.trim());
      if (codeIndex !== -1) {
        // Это резервный код - удаляем его
        const updatedBackupCodes = [...mfaData.backup_codes];
        updatedBackupCodes.splice(codeIndex, 1);
        
        await supabase
          .from('user_mfa')
          .update({ backup_codes: updatedBackupCodes })
          .eq('user_id', user.id);
        
        isValid = true;
        usedBackupCode = true;
      }
    }

    // Если не резервный код, проверяем TOTP
    if (!isValid) {
      isValid = speakeasy.totp.verify({
        secret: mfaData.secret,
        encoding: 'base32',
        token: code.trim(),
        window: 2, // Разрешаем отклонение ±1 интервал
      });
    }

    if (isValid) {
      // Сбрасываем счетчик неудачных попыток
      await supabase
        .from('user_mfa')
        .update({
          failed_attempts: 0,
          locked_until: null,
        })
        .eq('user_id', user.id);

      // Создаем сессию через magic link
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        siteUrl = origin || `${protocol}://${host}`;
      }

      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
        options: {
          redirectTo: `${siteUrl}/`,
        },
      });

      if (magicLinkError || !magicLinkData?.properties?.action_link) {
        return NextResponse.json(
          { error: 'Не удалось создать сессию' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          loginLink: magicLinkData.properties.action_link,
          usedBackupCode,
        },
        { status: 200 }
      );
    } else {
      // Увеличиваем счетчик неудачных попыток
      const newFailedAttempts = (mfaData.failed_attempts || 0) + 1;
      let lockedUntil: string | null = null;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockDate = new Date();
        lockDate.setMinutes(lockDate.getMinutes() + LOCK_DURATION_MINUTES);
        lockedUntil = lockDate.toISOString();
      }

      await supabase
        .from('user_mfa')
        .update({
          failed_attempts: newFailedAttempts,
          locked_until: lockedUntil,
        })
        .eq('user_id', user.id);

      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      const errorMessage = attemptsLeft > 0
        ? `Неверный код. Осталось попыток: ${attemptsLeft}`
        : `Превышено количество попыток. Аккаунт заблокирован на ${LOCK_DURATION_MINUTES} минут.`;

      return NextResponse.json(
        {
          error: errorMessage,
          attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0,
          locked: newFailedAttempts >= MAX_FAILED_ATTEMPTS,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in quick login with 2FA:', error);
    return NextResponse.json(
      { error: 'Ошибка при входе' },
      { status: 500 }
    );
  }
}


