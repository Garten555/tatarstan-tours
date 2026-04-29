// API для автоматической очистки сообщений через 90 дней после окончания туров
// Вызывать через cron job
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const TOUR_ROOM_RETENTION_DAYS = 14;

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
      
      interface Profile {
        role?: string;
      }
      if (!profile || !['super_admin', 'tour_admin'].includes((profile as Profile).role || '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = createServiceClient();

    // Вызываем функцию очистки сообщений
    const { data, error } = await serviceClient.rpc('delete_messages_after_90_days');

    if (error) {
      console.error('Ошибка очистки сообщений:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup messages', details: error.message },
        { status: 500 }
      );
    }

    // Дополнительно очищаем комнаты туров через 14 дней после завершения тура
    const roomsDeletedResult = await (async () => {
      const { data: rooms, error: roomsError } = await serviceClient
        .from('tour_rooms')
        .select(`
          id,
          tour:tours(
            id,
            end_date
          )
        `);

      if (roomsError) {
        console.error('Ошибка получения комнат туров для очистки:', roomsError);
        return { deleted: 0, error: roomsError.message };
      }

      if (!rooms || rooms.length === 0) {
        return { deleted: 0, error: null as string | null };
      }

      const now = Date.now();
      const retentionMs = TOUR_ROOM_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const roomIdsToDelete = (rooms as any[])
        .filter((room) => {
          const tour = Array.isArray(room?.tour) ? room.tour[0] : room?.tour;
          if (!tour?.end_date) return false;
          const endTs = new Date(tour.end_date).getTime();
          if (Number.isNaN(endTs)) return false;
          return now - endTs >= retentionMs;
        })
        .map((room) => room.id)
        .filter(Boolean);

      if (roomIdsToDelete.length === 0) {
        return { deleted: 0, error: null as string | null };
      }

      const { error: deleteRoomsError } = await serviceClient
        .from('tour_rooms')
        .delete()
        .in('id', roomIdsToDelete);

      if (deleteRoomsError) {
        console.error('Ошибка удаления комнат туров:', deleteRoomsError);
        return { deleted: 0, error: deleteRoomsError.message };
      }

      return { deleted: roomIdsToDelete.length, error: null as string | null };
    })();

    return NextResponse.json({
      success: true,
      deleted: data || 0,
      tour_rooms_deleted: roomsDeletedResult.deleted,
      tour_rooms_retention_days: TOUR_ROOM_RETENTION_DAYS,
      message: `Удалено сообщений: ${data || 0}`,
    });
  } catch (error) {
    console.error('Ошибка очистки сообщений:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


















