// API для автоматического удаления комнат туров через 14 дней после завершения выезда/тура
// Cron: POST /api/admin/cleanup/tour-rooms  (Authorization: Bearer CRON_SECRET)
// Удалить все: POST /api/admin/cleanup/tour-rooms?mode=all  (только super_admin)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  TOUR_ROOM_RETENTION_DAYS,
  cleanupExpiredTourRooms,
  deleteAllTourRooms,
} from '@/lib/tour-rooms/cleanup';

async function authorizeAdmin(request: NextRequest, requireSuperAdmin = false) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized =
    !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCronAuthorized) {
    return { ok: true as const, isCron: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;
  const allowed = requireSuperAdmin
    ? role === 'super_admin'
    : role != null &&
      ['super_admin', 'tour_admin', 'support_admin'].includes(role);

  if (!allowed) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, isCron: false };
}

export async function POST(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('mode');
    const deleteAll = mode === 'all';

    const auth = await authorizeAdmin(request, deleteAll);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const serviceClient = createServiceClient();

    const result = deleteAll
      ? await deleteAllTourRooms(serviceClient)
      : await cleanupExpiredTourRooms(serviceClient);

    const message = deleteAll
      ? `Удалено всех комнат: ${result.deleted}, файлов в облаке: ${result.s3Files}`
      : result.deleted > 0
        ? `Удалено комнат: ${result.deleted}, файлов в облаке: ${result.s3Files}`
        : `Нет комнат старше ${TOUR_ROOM_RETENTION_DAYS} дней после окончания выезда/тура`;

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      s3_files_deleted: result.s3Files,
      retention_days: TOUR_ROOM_RETENTION_DAYS,
      mode: deleteAll ? 'all' : 'retention',
      message,
    });
  } catch (error) {
    console.error('Ошибка очистки комнат туров:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
