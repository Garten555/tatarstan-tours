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
    const fileUrl = await uploadFileToS3(file, s3Path);

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
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить файл' },
      { status: 500 }
    );
  }
}
