import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !email.trim() || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не короче 6 символов' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Находим пользователя по email
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'Ошибка при поиске пользователя' },
        { status: 500 }
      );
    }
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Обновляем пароль через Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить пароль' },
        { status: 500 }
      );
    }

    // Генерируем ссылку для автоматического входа (magic link)
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (request.nextUrl.protocol === 'https:' ? 'https' : 'http');
    
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      if (origin) {
        siteUrl = origin;
      } else if (host) {
        siteUrl = `${protocol}://${host}`;
      } else {
        siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      }
    }

    // Генерируем magic link для автоматического входа
    let loginLink = null;
    try {
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
        options: {
          redirectTo: `${siteUrl}/profile`,
        },
      });
      
      if (!magicLinkError && magicLinkData) {
        loginLink = magicLinkData?.properties?.action_link || null;
      }
    } catch (linkError) {
      console.warn('Error generating magic link:', linkError);
      // Продолжаем без magic link
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Пароль успешно обновлён',
        loginLink
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in update password:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении пароля' },
      { status: 500 }
    );
  }
}

