// API для загрузки файлов в S3
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3, generateUniqueFileName } from '@/lib/s3/upload';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Максимальный размер файла
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
};

// Разрешённые типы файлов
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'],
};

export async function POST(request: NextRequest) {
  try {
    // Ранняя проверка конфигурации S3
    const requiredS3Vars = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET', 'S3_REGION'];
    const missingVars = requiredS3Vars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Отсутствуют переменные окружения S3:', missingVars.join(', '));
      return NextResponse.json(
        { 
          error: `Ошибка конфигурации хранилища файлов. Отсутствуют переменные окружения: ${missingVars.join(', ')}`,
          details: 'Проверьте настройки S3 на сервере',
        },
        { status: 500 }
      );
    }
    
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
    const folder = formData.get('folder') as string; // tours/covers, tours/gallery, tours/videos, diaries/covers, diaries/media

    // Проверяем права доступа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isDiaryUpload = folder?.startsWith('diaries/');
    const isReviewUpload = folder?.startsWith('reviews/');
    const isUserGalleryUpload = folder === 'user-gallery';
    
    // Для загрузки медиа дневников и галереи пользователя разрешаем всем авторизованным пользователям
    // Для туров - только админам
    if (!isDiaryUpload && !isReviewUpload && !isUserGalleryUpload && (!profile || !['super_admin', 'tour_admin'].includes((profile as any).role))) {
      return NextResponse.json(
        { error: 'Недостаточно прав для загрузки файлов' },
        { status: 403 }
      );
    }
    const tourId = formData.get('tourId') as string | null;
    const mediaType = formData.get('mediaType') as string | null; // photo, video

    // Валидация
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    // Определяем тип контента
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла' },
        { status: 400 }
      );
    }

    // Проверка размера файла
    const maxSize = isVideo ? MAX_FILE_SIZE.video : MAX_FILE_SIZE.image;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `Файл слишком большой. Максимум ${isVideo ? '100MB' : '10MB'}`,
        },
        { status: 400 }
      );
    }

    // Проверка типа файла
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
    // Для галереи пользователя используем путь users/gallery/{userId}/
    const s3Path = isUserGalleryUpload 
      ? `users/gallery/${user.id}/${uniqueFileName}`
      : `${folder}/${uniqueFileName}`;

    // Загружаем файл в S3
    let fileUrl: string;
    try {
      console.log(`📤 Загрузка файла в S3: ${s3Path} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      fileUrl = await uploadFileToS3(file, s3Path);
      console.log(`✅ Файл успешно загружен: ${fileUrl}`);
    } catch (s3Error: any) {
      console.error('❌ Ошибка загрузки в S3:', s3Error);
      
      // Если это ошибка конфигурации, возвращаем понятное сообщение
      if (s3Error.message?.includes('не задан') || s3Error.message?.includes('S3_')) {
        return NextResponse.json(
          { 
            error: 'Ошибка конфигурации хранилища файлов',
            details: s3Error.message || 'Проверьте переменные окружения S3 на сервере',
          },
          { status: 500 }
        );
      }
      
      // Пробрасываем ошибку дальше для общей обработки
      throw s3Error;
    }

    // Если указан tourId и mediaType - сохраняем в tour_media
    if (tourId && mediaType) {
      // Нормализуем значение mediaType под enum в БД
      const normalizedMediaType = mediaType === 'photo' ? 'image' : mediaType;
      if (process.env.NODE_ENV !== 'production') {
        console.log('💾 Сохранение медиа в БД:', {
          tour_id: tourId,
          media_type: normalizedMediaType,
          file_name: file.name,
        });
      }
      
      const { data: mediaData, error: mediaError } = await (serviceClient as any).from('tour_media').insert({
        tour_id: tourId,
        media_type: normalizedMediaType,
        media_url: fileUrl,
        media_path: s3Path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      }).select();
      
      if (mediaError) {
        console.error('❌ Ошибка сохранения медиа в БД:', mediaError);
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Медиа сохранено в БД:', mediaData);
      }
    } else {
      console.log('⚠️ Пропуск сохранения в БД (нет tourId или mediaType)');
    }

    // Возвращаем URL загруженного файла
    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: s3Path,
      fileName: uniqueFileName,
    });
  } catch (error: any) {
    console.error('❌ Ошибка загрузки файла:', error);
    
    // Детальное логирование ошибки
    if (error.message) {
      console.error('   Сообщение:', error.message);
    }
    if (error.code) {
      console.error('   Код ошибки:', error.code);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    
    // Определяем тип ошибки для более понятного сообщения
    let errorMessage = 'Не удалось загрузить файл';
    let statusCode = 500;
    
    if (error.message?.includes('S3') || error.message?.includes('S3_ENDPOINT') || error.message?.includes('S3_ACCESS_KEY')) {
      errorMessage = 'Ошибка конфигурации хранилища файлов. Проверьте настройки S3 на сервере.';
      statusCode = 500;
    } else if (error.message?.includes('credentials') || error.message?.includes('access')) {
      errorMessage = 'Ошибка доступа к хранилищу файлов. Проверьте права доступа.';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
}
