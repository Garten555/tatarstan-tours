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

    // ВАЖНО: Сначала автоматически очищаем истекшие коды
    await supabase.rpc('auto_cleanup_expired_codes');

    // Ищем код в БД
    const { data: resetCode, error: dbError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('code', code.trim())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !resetCode) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Код неверен или истек. Пожалуйста, запросите новый код.' 
        },
        { status: 200 }
      );
    }

    // Помечаем код как использованный
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', resetCode.id);

    // Проверяем, существует ли пользователь (код уже проверен выше)
    // Если код валиден, значит пользователь существует

    // Код валиден - возвращаем успех
    // Получаем информацию о пользователе для подтверждения
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    return NextResponse.json(
      { 
        isValid: true,
        email: email.trim().toLowerCase()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error verifying reset code:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Ошибка при проверке кода' 
      },
      { status: 200 }
    );
  }
}

