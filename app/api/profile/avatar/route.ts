// API для загрузки аватара пользователя
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3, generateUniqueFileName, getS3Path, deleteFileFromS3 } from '@/lib/s3/upload';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Максимальный размер файла для аватара (5MB)
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

// Разрешённые типы файлов для аватара
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию пользователя
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
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

    // Получаем данные формы
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Валидация
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Файл должен быть изображением' },
        { status: 400 }
      );
    }

    // Проверка типа файла (разрешённые форматы)
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Неподдерживаемый тип файла. Разрешены: ${ALLOWED_AVATAR_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Проверка размера файла
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимум 5MB' },
        { status: 400 }
      );
    }

    // Получаем текущий профиль для удаления старого аватара
    const { data: currentProfile } = await serviceClient
      .from('profiles')
      .select('avatar_url, avatar_path')
      .eq('id', user.id)
      .single();

    // Генерируем уникальное имя файла
    const uniqueFileName = generateUniqueFileName(file.name);
    const s3Path = getS3Path('avatar', uniqueFileName, user.id);

    // Загружаем файл в S3
    console.log('[Avatar Upload] Uploading to S3:', { s3Path, fileName: file.name, fileSize: file.size });
    const fileUrl = await uploadFileToS3(file, s3Path);
    console.log('[Avatar Upload] File uploaded, URL:', fileUrl);

    // Удаляем старый аватар из S3 (если был)
    if (currentProfile?.avatar_path) {
      try {
        await deleteFileFromS3(currentProfile.avatar_path);
      } catch (deleteError) {
        console.warn('Не удалось удалить старый аватар:', deleteError);
        // Продолжаем выполнение, даже если старый файл не удалился
      }
    }

    // Обновляем профиль в БД
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        avatar_url: fileUrl,
        avatar_path: s3Path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Ошибка обновления профиля:', updateError);
      // Пытаемся удалить загруженный файл из S3
      try {
        await deleteFileFromS3(s3Path);
      } catch (cleanupError) {
        console.error('Ошибка очистки после неудачного обновления:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Не удалось обновить профиль' },
        { status: 500 }
      );
    }

    // Обновляем user_metadata в auth для совместимости
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          avatar_url: fileUrl,
        },
      });
      
      if (metadataError) {
        console.warn('Не удалось обновить user_metadata:', metadataError);
        // Не критично, продолжаем
      }
    } catch (metadataError) {
      console.warn('Ошибка обновления user_metadata:', metadataError);
      // Не критично, продолжаем
    }

    // Возвращаем URL загруженного файла
    console.log('[Avatar Upload] Success, returning URL:', fileUrl);
    return NextResponse.json({
      url: fileUrl,
      path: s3Path,
    });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось загрузить аватар' },
      { status: 500 }
    );
  }
}

