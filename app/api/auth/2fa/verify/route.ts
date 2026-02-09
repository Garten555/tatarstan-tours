import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code || !code.trim()) {
      return NextResponse.json(
        { error: 'User ID и код обязательны' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Получаем данные MFA пользователя
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .single();

    if (mfaError || !mfaData) {
      return NextResponse.json(
        { error: '2FA не настроена для этого аккаунта' },
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
          lockedUntil: mfaData.locked_until,
        },
        { status: 423 } // 423 Locked
      );
    }

    // Проверяем, является ли это резервным кодом
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
          .eq('user_id', userId);
        
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
        .eq('user_id', userId);

      return NextResponse.json(
        {
          success: true,
          verified: true,
          usedBackupCode,
        },
        { status: 200 }
      );
    } else {
      // Увеличиваем счетчик неудачных попыток
      const newFailedAttempts = (mfaData.failed_attempts || 0) + 1;
      let lockedUntil: string | null = null;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Блокируем на 15 минут
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
        .eq('user_id', userId);

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
    console.error('Error in 2FA verify:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке кода' },
      { status: 500 }
    );
  }
}

