import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { dismissDmNotificationsForSender } from '@/lib/notifications/dismiss-on-chat-read';
import { rateLimit } from '@/lib/security/rate-limit';

const pusher =
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
        useTLS: true,
      })
    : null;

/** POST — мягко удалить всю переписку 1:1 у обоих участников */
export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, { windowMs: 60_000, maxRequests: 8 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов' },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil((limiter.resetTime - Date.now()) / 1000).toString() },
        }
      );
    }

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
    const peer_id = typeof body.peer_id === 'string' ? body.peer_id.trim() : '';
    if (!peer_id || peer_id === user.id) {
      return NextResponse.json({ error: 'Некорректный собеседник' }, { status: 400 });
    }

    const user1_id = user.id < peer_id ? user.id : peer_id;
    const user2_id = user.id < peer_id ? peer_id : user.id;

    const now = new Date().toISOString();

    const { data: toClear, error: selErr } = await serviceClient
      .from('user_messages')
      .select('id')
      .or(
        `and(sender_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(sender_id.eq.${user2_id},recipient_id.eq.${user1_id})`
      )
      .is('deleted_at', null);

    if (selErr) {
      console.error('[clear-thread] select', selErr);
      return NextResponse.json({ error: 'Не удалось очистить переписку' }, { status: 500 });
    }

    const ids = (toClear || []).map((r: { id: string }) => r.id);
    if (ids.length > 0) {
      const { error: msgErr } = await serviceClient
        .from('user_messages')
        .update({
          deleted_at: now,
          deleted_by: user.id,
        })
        .in('id', ids);

      if (msgErr) {
        console.error('[clear-thread] user_messages', msgErr);
        return NextResponse.json({ error: 'Не удалось очистить переписку' }, { status: 500 });
      }
    }

    const { error: convErr } = await serviceClient
      .from('user_conversations')
      .update({
        last_message_text: null,
        last_message_at: now,
        unread_count_user1: 0,
        unread_count_user2: 0,
      })
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id);

    if (convErr) {
      console.error('[clear-thread] user_conversations', convErr);
    }

    try {
      await dismissDmNotificationsForSender(serviceClient, user.id, peer_id);
      await dismissDmNotificationsForSender(serviceClient, peer_id, user.id);
    } catch (e) {
      console.error('[clear-thread] dismiss notifications', e);
    }

    if (pusher) {
      try {
        await pusher.trigger(`user-${user.id}`, 'dm-thread-cleared', { peer_id });
        await pusher.trigger(`user-${peer_id}`, 'dm-thread-cleared', { peer_id: user.id });
      } catch (e) {
        console.error('[clear-thread] pusher', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[clear-thread]', e);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
