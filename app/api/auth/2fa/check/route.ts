import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Находим пользователя по email
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { enabled: false },
        { status: 200 }
      );
    }

    // Проверяем статус 2FA
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('enabled')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .maybeSingle(); // Используем maybeSingle вместо single, чтобы не было ошибки если записи нет

    // Если ошибка и это не "не найдено", логируем
    if (mfaError && mfaError.code !== 'PGRST116') {
      console.error('Error checking 2FA:', mfaError);
    }

    return NextResponse.json(
      {
        enabled: !!mfaData?.enabled,
        userId: user.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking 2FA:', error);
    return NextResponse.json(
      { enabled: false },
      { status: 200 }
    );
  }
}

