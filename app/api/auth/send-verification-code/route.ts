import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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

    // Для отправки кода используем Supabase Auth (письмо пойдет через SMTP, настроенный в Supabase Dashboard)
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin || 'http://localhost:3000';
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/auth/login`,
        data: {
          first_name: firstName || null,
        },
      },
    });

    if (otpError) {
      console.error('❌ Failed to send verification code via Supabase Auth:', otpError);
      return NextResponse.json(
        { error: 'Не удалось отправить письмо. Пожалуйста, проверьте настройки email на сервере или попробуйте позже.' },
        { status: 500 }
      );
    }

    console.log(`✅ Verification code email sent via Supabase Auth to ${email.trim()}`);

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




