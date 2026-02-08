import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Проверяем, авторизован ли пользователь
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Пользователь не авторизован
      return NextResponse.json(
        { 
          isAuthenticated: false,
          user: null 
        },
        { status: 200 }
      );
    }

    // Пользователь авторизован - возвращаем информацию
    return NextResponse.json(
      { 
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking session:', error);
    // В случае ошибки считаем, что пользователь не авторизован
    return NextResponse.json(
      { 
        isAuthenticated: false,
        user: null 
      },
      { status: 200 }
    );
  }
}



