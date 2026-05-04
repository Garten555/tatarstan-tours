import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import { buildKeyUri, generateTotpSecret } from '@/lib/auth/totp';

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

export async function POST(_request: NextRequest) {
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

    const secretBase32 = generateTotpSecret();
    const otpauthUrl = buildKeyUri({
      accountEmail: user.email ?? user.id,
      issuer: 'Tatarstan Tours',
      secret: secretBase32,
    });

    // Генерируем резервные коды
    const backupCodes = generateBackupCodes(8);

    // Сохраняем секрет в БД (пока не включено)
    const { error: mfaError } = await supabase
      .from('user_mfa')
      .upsert({
        user_id: user.id,
        secret: secretBase32,
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

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json(
      {
        success: true,
        secret: secretBase32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes,
        manualEntryKey: secretBase32,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in 2FA setup:', error);
    return NextResponse.json(
      { error: 'Ошибка при настройке 2FA' },
      { status: 500 }
    );
  }
}

