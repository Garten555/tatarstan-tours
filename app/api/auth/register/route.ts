import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, middleName } = await request.json();

    if (!email || !email.trim() || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Проверяем, не существует ли уже пользователь с таким email
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже зарегистрирован' },
        { status: 400 }
      );
    }

    // Создаем пользователя через Admin API с подтвержденным email
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // Подтверждаем email сразу
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
      },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Не удалось создать аккаунт. Попробуйте позже.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in register:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при регистрации' },
      { status: 500 }
    );
  }
}




