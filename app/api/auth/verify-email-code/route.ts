import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !email.trim() || !code || !code.trim()) {
      return NextResponse.json(
        { error: 'Email и код обязательны' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ВАЖНО: Сначала автоматически очищаем истекшие коды для этого email перед проверкой
    await supabase.rpc('auto_cleanup_expired_verification_codes');

    // Ищем код в БД
    const { data: verificationCode, error: dbError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('code', code.trim())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !verificationCode) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Код неверен или истек. Пожалуйста, запросите новый код.' 
        },
        { status: 200 }
      );
    }

    // Помечаем код как использованный (триггер удалит его)
    await supabase
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    return NextResponse.json(
      { isValid: true, email: email.trim().toLowerCase() },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error verifying email code:', error);
    return NextResponse.json(
      { isValid: false, error: 'Ошибка при проверке кода' },
      { status: 200 }
    );
  }
}





