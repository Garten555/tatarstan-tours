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

    // Проверяем одноразовый код через Supabase Auth OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });

    if (verifyError) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Код неверен или истек. Пожалуйста, запросите новый код.' 
        },
        { status: 200 }
      );
    }

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

