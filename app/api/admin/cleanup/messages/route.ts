// API для автоматической очистки сообщений через 90 дней после окончания туров
// Вызывать через cron job
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  TOUR_ROOM_RETENTION_DAYS,
  cleanupExpiredTourRooms,
} from '@/lib/tour-rooms/cleanup';

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

    // Дополнительно очищаем комнаты туров через 14 дней после завершения выезда/тура
    let roomsDeletedResult = { deleted: 0, s3Files: 0, error: null as string | null };
    try {
      const cleaned = await cleanupExpiredTourRooms(serviceClient);
      roomsDeletedResult = { ...cleaned, error: null };
    } catch (roomCleanupError) {
      const message =
        roomCleanupError instanceof Error ? roomCleanupError.message : 'Unknown error';
      console.error('Ошибка очистки комнат туров:', roomCleanupError);
      roomsDeletedResult = { deleted: 0, s3Files: 0, error: message };
    }

    return NextResponse.json({
      success: true,
      deleted: data || 0,
      tour_rooms_deleted: roomsDeletedResult.deleted,
      tour_rooms_s3_deleted: roomsDeletedResult.s3Files,
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


















