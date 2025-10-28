// API для удаления файлов из S3
import { NextRequest, NextResponse } from 'next/server';
import { deleteFileFromS3 } from '@/lib/s3/upload';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию пользователя
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем права доступа (только для админов)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'tour_admin'].includes((profile as any).role)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления файлов' },
        { status: 403 }
      );
    }

    // Получаем путь к файлу
    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: 'Путь к файлу не предоставлен' },
        { status: 400 }
      );
    }

    // Удаляем файл из S3
    await deleteFileFromS3(path);

    return NextResponse.json({
      success: true,
      message: 'Файл успешно удалён',
    });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить файл' },
      { status: 500 }
    );
  }
}

