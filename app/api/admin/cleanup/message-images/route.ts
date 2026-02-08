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
      
      if (!profile || !['super_admin', 'tour_admin'].includes((profile as any).role)) {
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

    const now = new Date();
    let deletedCount = 0;
    const filesToDelete: string[] = [];

    // Фильтруем сообщения из закончившихся туров
    for (const message of messages) {
      const msg = message as any;
      const tour = msg?.room?.tour;
      if (tour && tour.end_date) {
        const tourEndDate = new Date(tour.end_date);
        if (tourEndDate < now && msg.image_path) {
          filesToDelete.push(msg.image_path);
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
      const messageIds = (messages as any[]).filter((m: any) => filesToDelete.includes(m.image_path || '')).map((m: any) => m.id);
      const { error: updateError } = await (serviceClient as any)
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



