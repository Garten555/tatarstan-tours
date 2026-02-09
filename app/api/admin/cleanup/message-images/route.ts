// API для автоматической очистки изображений из сообщений после окончания туров
// Вызывать через cron job
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { deleteFileFromS3 } from '@/lib/s3/upload';

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации (только для админов или cron)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}` && !cronSecret) {
      // Если нет секрета, проверяем через Supabase
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const profileRole = (profile as { role?: string } | null)?.role;
      if (!profileRole || !['super_admin', 'tour_admin'].includes(profileRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = createServiceClient();

    // Находим все сообщения с изображениями в комнатах, где тур уже закончился
    const { data: messages, error: messagesError } = await serviceClient
      .from('tour_room_messages')
      .select(`
        id,
        image_url,
        image_path,
        room_id,
        room:tour_rooms(
          tour:tours(
            id,
            end_date
          )
        )
      `)
      .not('image_path', 'is', null)
      .is('deleted_at', null);

    if (messagesError) {
      console.error('Ошибка получения сообщений:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No images to delete',
      });
    }

    interface MessageWithRoom {
      id: unknown;
      image_url: unknown;
      image_path: unknown;
      room_id: unknown;
      room: Array<{
        tour: Array<{
          id: unknown;
          end_date: unknown;
        }> | {
          id: unknown;
          end_date: unknown;
        } | null;
      }> | {
        tour: Array<{
          id: unknown;
          end_date: unknown;
        }> | {
          id: unknown;
          end_date: unknown;
        } | null;
      } | null;
    }

    const now = new Date();
    let deletedCount = 0;
    const filesToDelete: string[] = [];

    // Фильтруем сообщения из закончившихся туров
    for (const message of messages) {
      const msg = message as MessageWithRoom;
      let room = null;
      if (Array.isArray(msg.room) && msg.room.length > 0) {
        room = msg.room[0];
      } else if (msg.room && !Array.isArray(msg.room)) {
        room = msg.room;
      }

      let tour = null;
      if (room && room.tour) {
        if (Array.isArray(room.tour) && room.tour.length > 0) {
          tour = room.tour[0];
        } else if (!Array.isArray(room.tour)) {
          tour = room.tour;
        }
      }

      if (tour && tour.end_date) {
        const tourEndDate = new Date(String(tour.end_date));
        if (tourEndDate < now && msg.image_path) {
          filesToDelete.push(String(msg.image_path));
        }
      }
    }

    // Удаляем файлы из S3
    const deletePromises = filesToDelete.map((path) =>
      deleteFileFromS3(path).catch((err) => {
        console.warn(`Failed to delete ${path}:`, err);
        return null;
      })
    );

    await Promise.all(deletePromises);
    deletedCount = filesToDelete.length;

    // Очищаем image_url и image_path в БД для удаленных файлов
    if (filesToDelete.length > 0) {
      const messageIds = (messages as MessageWithRoom[])
        .filter((m) => m.image_path && filesToDelete.includes(String(m.image_path)))
        .map((m) => String(m.id));
      const { error: updateError } = await serviceClient
        .from('tour_room_messages')
        .update({
          image_url: null,
          image_path: null,
        })
        .in('id', messageIds);

      if (updateError) {
        console.error('Ошибка обновления сообщений:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `Deleted ${deletedCount} image(s) from messages`,
    });
  } catch (error) {
    console.error('Ошибка очистки изображений:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



