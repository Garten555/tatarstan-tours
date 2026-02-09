import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/admin/support/cleanup - автоматическая очистка старых сессий
// Этот endpoint можно вызывать через cron job
export async function POST(request: NextRequest) {
  try {
    const serviceClient = await createServiceClient();

    // Проверяем авторизацию (опционально, можно сделать публичным для cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Архивируем закрытые сессии старше 7 дней
    const { error: archiveError } = await (serviceClient as any)
      .rpc('archive_old_closed_sessions');

    if (archiveError) {
      console.error('Ошибка архивирования сессий:', archiveError);
    }

    // Удаляем архивные сессии старше 30 дней
    const { error: deleteError } = await (serviceClient as any)
      .rpc('delete_old_archived_sessions');

    if (deleteError) {
      console.error('Ошибка удаления сессий:', deleteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Очистка завершена',
    });
  } catch (error) {
    console.error('Ошибка очистки сессий:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



