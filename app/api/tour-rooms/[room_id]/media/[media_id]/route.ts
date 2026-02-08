// API для удаления медиа в комнатах туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { deleteFileFromS3 } from '@/lib/s3/upload';

// DELETE /api/tour-rooms/[room_id]/media/[media_id]
// Удалить медиа
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string; media_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id, media_id } = await params;

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

    // Получаем медиа
    const { data: media, error: mediaError } = await serviceClient
      .from('tour_room_media')
      .select('user_id, room_id, media_path')
      .eq('id', media_id)
      .single();

    if (mediaError || !media) {
      return NextResponse.json(
        { error: 'Медиа не найдено' },
        { status: 404 }
      );
    }

    // Проверяем права: пользователь может удалять свое медиа
    const canDeleteOwn = media.user_id === user.id;

    // Проверяем права гида
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', room_id)
      .single();

    const isGuide = room?.guide_id === user.id;

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

    if (!canDeleteOwn && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления медиа' },
        { status: 403 }
      );
    }

    // Удаляем файл из S3
    try {
      await deleteFileFromS3(media.media_path);
      // Если есть превью - удаляем и его
      if (media.media_path.includes('/videos/')) {
        // TODO: Удаление превью если есть
      }
    } catch (s3Error) {
      console.error('Ошибка удаления файла из S3:', s3Error);
      // Продолжаем удаление из БД даже если S3 ошибка
    }

    // Удаляем запись из БД
    const { error: deleteError } = await serviceClient
      .from('tour_room_media')
      .delete()
      .eq('id', media_id);

    if (deleteError) {
      console.error('Ошибка удаления медиа из БД:', deleteError);
      return NextResponse.json(
        { error: 'Не удалось удалить медиа' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления медиа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}






