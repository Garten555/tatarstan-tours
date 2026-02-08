// API для загрузки изображений только для сообщений (не в галерею)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { uploadFileToS3, generateUniqueFileName } from '@/lib/s3/upload';

// Максимальный размер файла
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Разрешённые типы файлов
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    console.log('[Message Image Upload] Starting upload...');
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;
    console.log('[Message Image Upload] Room ID:', room_id);

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Message Image Upload] Auth error:', authError);
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    console.log('[Message Image Upload] User authenticated:', user.id);

    // Проверяем доступ к комнате
    const [roomResult, participantResult, profileResult] = await Promise.all([
      serviceClient.from('tour_rooms').select('guide_id').eq('id', room_id).maybeSingle(),
      serviceClient.from('tour_room_participants').select('id').eq('room_id', room_id).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('role, is_banned, ban_until, ban_reason').eq('id', user.id).maybeSingle(),
    ]);

    const room = roomResult.data;
    const participant = participantResult.data;
    const profile = profileResult.data;

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';

    if (!isAdmin && profile?.is_banned) {
      if (profile.ban_until) {
        const until = new Date(profile.ban_until);
        if (until.getTime() <= Date.now()) {
          await serviceClient
            .from('profiles')
            .update({ is_banned: false, ban_until: null, ban_reason: null, banned_at: null })
            .eq('id', user.id);
        } else {
          return NextResponse.json(
            { error: profile.ban_reason || 'Вы заблокированы', ban_until: profile.ban_until },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: profile.ban_reason || 'Вы заблокированы' },
          { status: 403 }
        );
      }
    }

    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      console.error('[Message Image Upload] Access denied');
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // Получаем данные формы
    console.log('[Message Image Upload] Getting form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Message Image Upload] No file provided');
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }
    console.log('[Message Image Upload] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      console.error('[Message Image Upload] Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Разрешены только изображения' },
        { status: 400 }
      );
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      console.error('[Message Image Upload] File too large:', file.size);
      return NextResponse.json(
        { error: `Файл слишком большой. Максимум 10MB` },
        { status: 400 }
      );
    }

    // Проверка типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error('[Message Image Upload] Unsupported file type:', file.type);
      return NextResponse.json(
        { error: `Неподдерживаемый тип файла. Разрешены: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Генерируем путь в S3 (отдельная папка для фото из сообщений)
    const uniqueFileName = generateUniqueFileName(file.name);
    const s3Path = `tour-rooms/${room_id}/messages/images/${uniqueFileName}`;
    console.log('[Message Image Upload] S3 path:', s3Path);

    // Загружаем файл в S3
    console.log('[Message Image Upload] Uploading to S3...');
    let fileUrl: string;
    try {
      fileUrl = await uploadFileToS3(file, s3Path);
      console.log('[Message Image Upload] File uploaded to S3:', fileUrl);
    } catch (s3Error) {
      console.error('[Message Image Upload] S3 upload error:', s3Error);
      throw s3Error;
    }

    // НЕ сохраняем в tour_room_media - только возвращаем URL и путь для сохранения в сообщении
    console.log('[Message Image Upload] Success! Returning URL and path');
    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: s3Path,
    });
  } catch (error: any) {
    console.error('[Message Image Upload] Unexpected error:', error);
    console.error('[Message Image Upload] Error stack:', error?.stack);
    console.error('[Message Image Upload] Error message:', error?.message);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}




