// API для автоматического удаления комнат туров через 14 дней после завершения тура
// Предназначено для запуска по cron
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const RETENTION_DAYS = 14;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized =
      !!cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Если это не cron-запуск — допускаем только админов
    if (!isCronAuthorized) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = (profile as { role?: string } | null)?.role;
      if (!role || !['super_admin', 'tour_admin'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = createServiceClient();

    // Получаем комнаты с датами завершения туров
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
      console.error('Ошибка получения комнат туров:', roomsError);
      return NextResponse.json(
        { error: 'Failed to fetch tour rooms' },
        { status: 500 }
      );
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No tour rooms to cleanup',
      });
    }

    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const roomIdsToDelete = (rooms as any[])
      .filter((room) => {
        const tour = Array.isArray(room?.tour) ? room.tour[0] : room?.tour;
        if (!tour?.end_date) return false;
        const endTime = new Date(tour.end_date).getTime();
        if (Number.isNaN(endTime)) return false;
        return now - endTime >= retentionMs;
      })
      .map((room) => room.id)
      .filter(Boolean);

    if (roomIdsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: `No rooms older than ${RETENTION_DAYS} days after tour end date`,
      });
    }

    // Удаляем комнаты, связанные данные удаляются по CASCADE (если настроено в БД)
    const { error: deleteError } = await serviceClient
      .from('tour_rooms')
      .delete()
      .in('id', roomIdsToDelete);

    if (deleteError) {
      console.error('Ошибка удаления комнат туров:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cleanup tour rooms' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: roomIdsToDelete.length,
      retention_days: RETENTION_DAYS,
      message: `Deleted ${roomIdsToDelete.length} tour room(s)`,
    });
  } catch (error) {
    console.error('Ошибка очистки комнат туров:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
