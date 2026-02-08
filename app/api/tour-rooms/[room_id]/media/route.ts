// API для работы с медиа в комнатах туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { uploadFileToS3, generateUniqueFileName } from '@/lib/s3/upload';

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

// GET /api/tour-rooms/[room_id]/media
// Получить медиа комнаты (фильтр: temporary/archived/all)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;

    // Проверка авторизации
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

    // Получаем комнату для проверки guide_id
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', room_id)
      .single();

    // Проверяем доступ к комнате: участник, гид или админ
    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .single();

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // Получаем параметры фильтрации
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // temporary, archived, all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Строим запрос с фильтром
    // Оптимизировано: выбираем только нужные поля
    let query = serviceClient
      .from('tour_room_media')
      .select(`
        id,
        room_id,
        user_id,
        media_type,
        media_url,
        media_path,
        thumbnail_url,
        file_name,
        file_size,
        mime_type,
        is_temporary,
        archived_at,
        created_at,
        user:profiles(id, first_name, last_name, avatar_url)
      `)
      .eq('room_id', room_id);

    // Применяем фильтр
    if (filter === 'temporary') {
      query = query.eq('is_temporary', true);
    } else if (filter === 'archived') {
      query = query.eq('is_temporary', false);
    }

    // Применяем сортировку и пагинацию
    query = query.order('created_at', { ascending: false }).limit(limit); // Используем limit вместо range

    const { data: media, error: mediaError } = await query;

    if (mediaError) {
      console.error('Ошибка получения медиа:', mediaError);
      return NextResponse.json(
        { error: 'Не удалось получить медиа' },
        { status: 500 }
      );
    }

    // Оптимизировано: не используем count: 'exact' (медленно)
    // Используем приблизительное количество на основе загруженных данных
    const estimatedTotal = media ? media.length : 0;

    return NextResponse.json({
      success: true,
      media: media || [],
      pagination: {
        page,
        limit,
        total: estimatedTotal,
        totalPages: Math.ceil(estimatedTotal / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения медиа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/tour-rooms/[room_id]/media
// Загрузить медиа (фото/видео)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    console.log('[Media Upload] Starting upload process...');
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;
    console.log('[Media Upload] Room ID:', room_id);

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Media Upload] Auth error:', authError);
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    console.log('[Media Upload] User authenticated:', user.id);

    // Получаем комнату для проверки guide_id
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id, tour:tours(id, end_date)')
      .eq('id', room_id)
      .single();

    // Проверяем доступ к комнате: участник, гид или админ
    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .single();

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // room уже получен выше, используем его
    if (!room) {
      return NextResponse.json(
        { error: 'Комната не найдена' },
        { status: 404 }
      );
    }

    // Получаем данные формы
    console.log('[Media Upload] Getting form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Media Upload] No file provided');
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }
    console.log('[Media Upload] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

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

    // Определяем, временное ли медиа (тур еще не закончился)
    const tourData = Array.isArray((room as any).tour)
      ? (room as any).tour[0]
      : (room as any).tour;
    const tourEndDate = tourData?.end_date;
    const isTemporary = !tourEndDate || new Date(tourEndDate) > new Date();

    // Генерируем путь в S3
    const folder = isTemporary ? 'temporary' : 'archive';
    const mediaType = isVideo ? 'videos' : 'images';
    const uniqueFileName = generateUniqueFileName(file.name);
    const s3Path = `tour-rooms/${room_id}/${folder}/${mediaType}/${uniqueFileName}`;
    console.log('[Media Upload] S3 path:', s3Path);

    // Загружаем файл в S3
    console.log('[Media Upload] Uploading to S3...');
    let fileUrl: string;
    try {
      fileUrl = await uploadFileToS3(file, s3Path);
      console.log('[Media Upload] File uploaded to S3:', fileUrl);
    } catch (s3Error) {
      console.error('[Media Upload] S3 upload error:', s3Error);
      throw s3Error;
    }

    // Генерируем превью для видео (пока просто null, можно добавить генерацию)
    let thumbnailUrl = null;
    if (isVideo) {
      // TODO: Генерация превью для видео
      thumbnailUrl = null;
    }

    // Сохраняем в БД
    console.log('[Media Upload] Saving to database...');
    const { data: mediaData, error: mediaError } = await serviceClient
      .from('tour_room_media')
      .insert({
        room_id,
        user_id: user.id,
        media_type: isVideo ? 'video' : 'image',
        media_url: fileUrl,
        media_path: s3Path,
        thumbnail_url: thumbnailUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_temporary: isTemporary,
        ...(isTemporary ? {} : { archived_at: new Date().toISOString() }),
      })
      .select(`
        *,
        user:profiles(id, first_name, last_name, avatar_url)
      `)
      .single();

    if (mediaError) {
      console.error('[Media Upload] Database error:', mediaError);
      console.error('[Media Upload] Error details:', JSON.stringify(mediaError, null, 2));
      return NextResponse.json(
        { error: 'Не удалось сохранить медиа', details: mediaError.message },
        { status: 500 }
      );
    }

    console.log('[Media Upload] Success! Media ID:', mediaData?.id);
    return NextResponse.json({
      success: true,
      media: mediaData,
    });
  } catch (error: any) {
    console.error('[Media Upload] Unexpected error:', error);
    console.error('[Media Upload] Error stack:', error?.stack);
    console.error('[Media Upload] Error message:', error?.message);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

