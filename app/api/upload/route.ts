// API для загрузки файлов в S3
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3, generateUniqueFileName, getS3Path } from '@/lib/s3/upload';
import { createClient } from '@/lib/supabase/server';

// Максимальный размер файла (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Разрешённые типы файлов
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
};

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
        { error: 'Недостаточно прав для загрузки файлов' },
        { status: 403 }
      );
    }

    // Получаем данные формы
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    // Валидация
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    if (!type || !['tour-cover', 'tour-gallery', 'tour-video', 'avatar'].includes(type)) {
      return NextResponse.json(
        { error: 'Неверный тип файла' },
        { status: 400 }
      );
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимум 10MB' },
        { status: 400 }
      );
    }

    // Проверка типа файла
    const isVideo = type === 'tour-video';
    const allowedTypes = isVideo ? ALLOWED_TYPES.video : ALLOWED_TYPES.image;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Неподдерживаемый тип файла. Разрешены: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Генерируем уникальное имя файла
    const uniqueFileName = generateUniqueFileName(file.name);
    const s3Path = getS3Path(type as any, uniqueFileName);

    // Загружаем файл в S3
    const fileUrl = await uploadFileToS3(file, s3Path);

    // Возвращаем URL загруженного файла
    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: s3Path,
      fileName: uniqueFileName,
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить файл' },
      { status: 500 }
    );
  }
}

