import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, getEmailVerificationCodeEmail } from '@/lib/email/send-email';

// Генерируем случайный 6-значный код
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Проверяем, не существует ли уже пользователь с таким email
    let user;
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      user = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    } catch (error) {
      console.error('Error checking user:', error);
    }
    
    // Если пользователь уже существует, возвращаем ошибку
    if (user) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже зарегистрирован' },
        { status: 400 }
      );
    }

    // ВАЖНО: Сначала автоматически очищаем истекшие коды
    await supabase.rpc('auto_cleanup_expired_verification_codes');

    // Генерируем 6-значный код
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Код действителен 15 минут

    // Сохраняем код в БД
    // Триггер автоматически удалит старые коды для этого email
    const { error: dbError } = await supabase
      .from('email_verification_codes')
      .insert({
        email: email.trim().toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (dbError) {
      console.error('Error saving verification code:', dbError);
      return NextResponse.json(
        { error: 'Не удалось сгенерировать код подтверждения' },
        { status: 500 }
      );
    }

    // Получаем имя пользователя для персонализации письма
    const userName = firstName || email.split('@')[0] || 'пользователь';

    // Отправляем письмо с кодом
    const emailHtml = getEmailVerificationCodeEmail(userName, code);
    const emailSent = await sendEmail({
      to: email.trim(),
      subject: 'Код подтверждения email - Туры по Татарстану',
      html: emailHtml,
    });

    if (!emailSent) {
      console.error('Failed to send verification code email');
      return NextResponse.json(
        { error: 'Не удалось отправить письмо. Проверьте настройки email.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Код подтверждения отправлен на ваш email' 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in send verification code:', error);
    return NextResponse.json(
      { error: error.message || 'Не удалось отправить код. Проверьте email.' },
      { status: 500 }
    );
  }
}



