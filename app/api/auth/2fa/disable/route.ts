import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Код подтверждения обязателен' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Получаем данные MFA
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (mfaError || !mfaData) {
      return NextResponse.json(
        { error: '2FA не включена' },
        { status: 400 }
      );
    }

    // Проверяем код (TOTP или резервный)
    let isValid = false;

    // Проверяем резервные коды
    if (mfaData.backup_codes && Array.isArray(mfaData.backup_codes)) {
      isValid = mfaData.backup_codes.includes(code.trim());
    }

    // Если не резервный код, проверяем TOTP
    if (!isValid) {
      isValid = speakeasy.totp.verify({
        secret: mfaData.secret,
        encoding: 'base32',
        token: code.trim(),
        window: 2,
      });
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Неверный код подтверждения' },
        { status: 400 }
      );
    }

    // Отключаем 2FA
    const { error: updateError } = await supabase
      .from('user_mfa')
      .update({
        enabled: false,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error disabling 2FA:', updateError);
      return NextResponse.json(
        { error: 'Не удалось отключить 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Двухфакторная аутентификация отключена',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in 2FA disable:', error);
    return NextResponse.json(
      { error: 'Ошибка при отключении 2FA' },
      { status: 500 }
    );
  }
}

