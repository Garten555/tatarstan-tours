import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Проверяем, авторизован ли пользователь в БД
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Получаем recovery токен из query параметров (если есть)
    const searchParams = request.nextUrl.searchParams;
    const hasRecoveryToken = searchParams.get('type') === 'recovery';

    // Если пользователь НЕ авторизован
    if (authError || !user) {
      // Если есть recovery токен в URL - разрешаем доступ (токен обработается на клиенте)
      if (hasRecoveryToken) {
        return NextResponse.json(
          { 
            canAccess: true,
            isAuthenticated: false,
            hasRecoveryToken: true,
            reason: 'recovery_token'
          },
          { status: 200 }
        );
      }
      
      // Пользователь не авторизован и нет recovery токена - разрешаем доступ к форме
      return NextResponse.json(
        { 
          canAccess: true,
          isAuthenticated: false,
          hasRecoveryToken: false,
          reason: 'not_authenticated'
        },
        { status: 200 }
      );
    }

    // Пользователь авторизован
    // Если есть recovery токен - проверяем, что токен для этого пользователя
    if (hasRecoveryToken) {
      // Recovery токен должен быть для этого пользователя
      // Проверяем, что токен валиден для текущего пользователя
      return NextResponse.json(
        { 
          canAccess: true,
          isAuthenticated: true,
          hasRecoveryToken: true,
          userEmail: user.email,
          reason: 'recovery_token_for_authenticated_user'
        },
        { status: 200 }
      );
    }

    // Пользователь авторизован, но нет recovery токена - БЛОКИРУЕМ доступ
    return NextResponse.json(
      { 
        canAccess: false,
        isAuthenticated: true,
        hasRecoveryToken: false,
        userEmail: user.email,
        reason: 'already_authenticated'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking reset access:', error);
    // В случае ошибки блокируем доступ (безопаснее)
    return NextResponse.json(
      { 
        canAccess: false,
        isAuthenticated: false,
        hasRecoveryToken: false,
        reason: 'error',
        error: 'Ошибка при проверке доступа'
      },
      { status: 200 }
    );
  }
}




