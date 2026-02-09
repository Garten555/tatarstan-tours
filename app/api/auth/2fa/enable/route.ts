import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Код обязателен' },
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

    // Получаем секрет пользователя
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (mfaError || !mfaData || !mfaData.secret) {
      return NextResponse.json(
        { error: 'Сначала настройте 2FA' },
        { status: 400 }
      );
    }

    if (mfaData.enabled) {
      return NextResponse.json(
        { error: '2FA уже включена' },
        { status: 400 }
      );
    }

    // Проверяем код
    const verified = speakeasy.totp.verify({
      secret: mfaData.secret,
      encoding: 'base32',
      token: code.trim(),
      window: 2, // Разрешаем отклонение ±1 интервал (60 секунд)
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Неверный код. Проверьте время на устройстве и попробуйте снова.' },
        { status: 400 }
      );
    }

    // Включаем 2FA
    const { error: updateError } = await supabase
      .from('user_mfa')
      .update({
        enabled: true,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error enabling 2FA:', updateError);
      return NextResponse.json(
        { error: 'Не удалось включить 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Двухфакторная аутентификация успешно включена',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in 2FA enable:', error);
    return NextResponse.json(
      { error: 'Ошибка при включении 2FA' },
      { status: 500 }
    );
  }
}

