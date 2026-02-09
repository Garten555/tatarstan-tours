import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Генерируем резервные коды
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Генерируем 8-значный код
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, не включена ли уже 2FA
    const { data: existingMFA } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (existingMFA) {
      return NextResponse.json(
        { error: 'Двухфакторная аутентификация уже включена' },
        { status: 400 }
      );
    }

    // Генерируем секрет для TOTP
    const secret = speakeasy.generateSecret({
      name: `Tatarstan Tours (${user.email})`,
      issuer: 'Tatarstan Tours',
      length: 32,
    });

    // Генерируем резервные коды
    const backupCodes = generateBackupCodes(8);

    // Сохраняем секрет в БД (пока не включено)
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .upsert({
        user_id: user.id,
        secret: secret.base32, // Сохраняем base32 секрет
        enabled: false,
        backup_codes: backupCodes,
        failed_attempts: 0,
      })
      .select()
      .single();

    if (mfaError) {
      console.error('Error saving MFA secret:', mfaError);
      return NextResponse.json(
        { error: 'Не удалось сохранить настройки 2FA' },
        { status: 500 }
      );
    }

    // Генерируем QR-код
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return NextResponse.json(
      {
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes,
        manualEntryKey: secret.base32, // Для ручного ввода
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in 2FA setup:', error);
    return NextResponse.json(
      { error: 'Ошибка при настройке 2FA' },
      { status: 500 }
    );
  }
}

