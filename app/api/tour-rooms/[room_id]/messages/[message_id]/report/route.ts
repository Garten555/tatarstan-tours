import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { publishAdminModerationChanged } from '@/lib/pusher/data-sync';
import { requireTourRoomAccess } from '@/lib/tour-rooms/room-access';

function isMissingReportsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    /tour_room_message_reports|relation.*does not exist|schema cache/i.test(error.message || '')
  );
}

function isMissingOptionalColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    /is_reported|reported_at|reported_by|report_reason|deleted_at/i.test(error.message || '')
  );
}

async function loadMessageInRoom(
  serviceClient: ReturnType<typeof createServiceClient>,
  room_id: string,
  message_id: string
) {
  let result = await serviceClient
    .from('tour_room_messages')
    .select('id, user_id')
    .eq('id', message_id)
    .eq('room_id', room_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (result.error && isMissingOptionalColumn(result.error)) {
    result = await serviceClient
      .from('tour_room_messages')
      .select('id, user_id')
      .eq('id', message_id)
      .eq('room_id', room_id)
      .maybeSingle();
  }

  return result;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string; message_id: string }> }
) {
  try {
    const { room_id, message_id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    const [profileResult, messageLookup] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      loadMessageInRoom(serviceClient, room_id, message_id),
    ]);

    const { data: profile } = profileResult;
    const { data: messageRow, error: messageError } = messageLookup;

    if (messageError) {
      console.error('[tour-room-message-report] message lookup:', messageError);
      return NextResponse.json(
        { error: 'Не удалось найти сообщение', details: messageError.message },
        { status: 500 }
      );
    }

    if (!messageRow) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    const accessCheck = await requireTourRoomAccess(
      serviceClient,
      room_id,
      user.id,
      profile?.role
    );
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    if (messageRow.user_id === user.id) {
      return NextResponse.json({ error: 'Нельзя пожаловаться на своё сообщение' }, { status: 400 });
    }

    const { data: insertedReport, error: insertError } = await serviceClient
      .from('tour_room_message_reports')
      .insert({
        message_id,
        room_id,
        reporter_id: user.id,
        reason: reason || null,
      })
      .select('id')
      .single();

    if (insertError) {
      if (!isMissingReportsTable(insertError)) {
        console.error('[tour-room-message-report] insert:', insertError);
        return NextResponse.json(
          {
            error: 'Не удалось сохранить жалобу в базу',
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        );
      }
    }

    const { error: flagError } = await serviceClient
      .from('tour_room_messages')
      .update({
        is_reported: true,
        reported_at: new Date().toISOString(),
        reported_by: user.id,
        report_reason: reason,
      })
      .eq('id', message_id)
      .eq('room_id', room_id);

    if (flagError && !isMissingOptionalColumn(flagError)) {
      console.error('[tour-room-message-report] flags:', flagError);
    }

    if (insertError && isMissingReportsTable(insertError)) {
      if (flagError && isMissingOptionalColumn(flagError)) {
        return NextResponse.json(
          {
            error:
              'Таблица tour_room_message_reports не найдена. Выполните SQL из database/snippets/010_tour_room_message_reports_table.sql в Supabase.',
          },
          { status: 503 }
        );
      }
    }

    if (!insertedReport?.id && flagError && !isMissingOptionalColumn(flagError)) {
      return NextResponse.json({ error: 'Не удалось отправить жалобу' }, { status: 500 });
    }

    void publishAdminModerationChanged();
    return NextResponse.json({ success: true, report_id: insertedReport?.id ?? null });
  } catch (error) {
    console.error('Ошибка жалобы на сообщение:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
