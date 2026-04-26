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

    // Для отправки кода используем Supabase Auth (SMTP в Supabase Dashboard)
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin || 'http://localhost:3000';
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/auth/reset-password`,
      },
    });

    if (otpError) {
      console.error('❌ Failed to send reset code via Supabase Auth:', otpError);
      return NextResponse.json(
        {
          success: true,
          message: 'Если email существует, письмо с кодом будет отправлено',
        },
        { status: 200 }
      );
    }

    console.log(`✅ Reset code sent via Supabase Auth to ${email.trim()}`);
    
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

