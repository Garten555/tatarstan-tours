import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Проверяем, авторизован ли пользователь
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Пользователь не авторизован - токен недействителен
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Токен восстановления недействителен или истек' 
        },
        { status: 200 }
      );
    }

    // ВАЖНО: Проверяем, что email в токене совпадает с email пользователя, который запросил сброс
    // Это гарантирует, что токен принадлежит конкретному пользователю
    if (user.email?.toLowerCase().trim() !== email.toLowerCase().trim()) {
      // Email не совпадает - это не тот пользователь!
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Токен восстановления не соответствует указанному email' 
        },
        { status: 200 }
      );
    }

    // Токен валиден и принадлежит правильному пользователю
    return NextResponse.json(
      { 
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error verifying recovery token:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Ошибка при проверке токена восстановления' 
      },
      { status: 200 }
    );
  }
}




