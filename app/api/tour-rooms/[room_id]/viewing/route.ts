import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { dismissTourRoomNotificationsForDeparture } from '@/lib/notifications/dismiss-on-chat-read';
import {
  getRelatedRoomIds,
  getRoomScope,
} from '@/lib/tour-rooms/merged-room-participants';
import { requireTourRoomAccess } from '@/lib/tour-rooms/room-access';
import {
  clearTourRoomViewing,
  touchTourRoomViewing,
} from '@/lib/tour-rooms/viewing-presence';

async function relatedRoomIdsFor(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  roomId: string
): Promise<string[]> {
  const scope = await getRoomScope(serviceClient, roomId);
  if (!scope) return [roomId];
  return getRelatedRoomIds(serviceClient, scope);
}

/** POST — пользователь смотрит комнату: presence + сброс уведомлений выезда. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { room_id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const accessCheck = await requireTourRoomAccess(
      serviceClient,
      room_id,
      user.id,
      profile?.role
    );
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const relatedRoomIds = await relatedRoomIdsFor(serviceClient, room_id);
    touchTourRoomViewing(user.id, relatedRoomIds);
    await dismissTourRoomNotificationsForDeparture(serviceClient, user.id, room_id);

    return NextResponse.json({ success: true, relatedRoomIds });
  } catch (error) {
    console.error('[tour-room viewing POST]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/** DELETE — пользователь покинул комнату. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const { room_id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    clearTourRoomViewing(user.id);
    return NextResponse.json({ success: true, room_id });
  } catch (error) {
    console.error('[tour-room viewing DELETE]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
