import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, getPasswordResetCodeEmail } from '@/lib/email/send-email';

// Генерируем случайный 6-значный код
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Проверяем, существует ли пользователь с таким email
    // Используем getUserByEmail через Admin API
    let user;
    try {
      // Получаем пользователя по email
      const { data: userList } = await supabase.auth.admin.listUsers();
      user = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    } catch (error) {
      console.error('Error checking user:', error);
    }
    
    // Не раскрываем информацию о существовании email
    if (!user) {
      return NextResponse.json(
        { success: true, message: 'Если email существует, письмо будет отправлено' },
        { status: 200 }
      );
    }

    // ВАЖНО: Сначала автоматически очищаем истекшие коды
    await supabase.rpc('auto_cleanup_expired_codes');

    // Генерируем 6-значный код
    const code = generateResetCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Код действителен 15 минут

    // Сохраняем код в БД
    // Триггер автоматически удалит старые коды для этого email
    const { error: dbError } = await supabase
      .from('password_reset_codes')
      .insert({
        email: email.trim().toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (dbError) {
      console.error('Error saving reset code:', dbError);
      // Не раскрываем информацию о существовании email
      return NextResponse.json(
        { success: true, message: 'Если email существует, письмо будет отправлено' },
        { status: 200 }
      );
    }

    // Получаем информацию о пользователе для персонализации письма
    const userName = user.user_metadata?.first_name || 
                     user.user_metadata?.username || 
                     user.email?.split('@')[0] || 
                     'пользователь';

    // Отправляем письмо с кодом
    const emailHtml = getPasswordResetCodeEmail(userName, code);
    const emailSent = await sendEmail({
      to: email.trim(),
      subject: 'Код восстановления пароля - Туры по Татарстану',
      html: emailHtml,
    });

    if (!emailSent) {
      console.error('Failed to send reset code email');
      // Все равно возвращаем успех для безопасности
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Если email существует, письмо с кодом будет отправлено' 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in reset password:', error);
    // Возвращаем успех даже при ошибке для безопасности
    return NextResponse.json(
      { 
        success: true, 
        message: 'Если email существует, письмо будет отправлено' 
      },
      { status: 200 }
    );
  }
}

