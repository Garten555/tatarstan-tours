// API для удаления сообщений в комнатах туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { deleteFileFromS3 } from '@/lib/s3/upload';

// DELETE /api/tour-rooms/[room_id]/messages/[message_id]
// Удалить сообщение (мягкое удаление)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string; message_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id, message_id } = await params;

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

    // Получаем сообщение с путем к изображению
    const { data: message, error: messageError } = await serviceClient
      .from('tour_room_messages')
      .select('user_id, room_id, image_path')
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Сообщение не найдено' },
        { status: 404 }
      );
    }

    // Проверяем права: пользователь может удалять свои сообщения
    const canDeleteOwn = message.user_id === user.id;

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
        { error: 'Недостаточно прав для удаления сообщения' },
        { status: 403 }
      );
    }

    // Удаляем изображение из S3 если есть (асинхронно, не блокируем ответ)
    if (message.image_path) {
      deleteFileFromS3(message.image_path).catch((err) => {
        console.warn('Не удалось удалить изображение из S3:', err);
        // Не прерываем процесс, если файл не удалился
      });
    }

    // Мягкое удаление (очищаем image_url и image_path)
    const { error: deleteError } = await serviceClient
      .from('tour_room_messages')
      .update({ 
        deleted_at: new Date().toISOString(),
        image_url: null,
        image_path: null,
      })
      .eq('id', message_id);

    if (deleteError) {
      console.error('Ошибка удаления сообщения:', deleteError);
      return NextResponse.json(
        { error: 'Не удалось удалить сообщение' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



