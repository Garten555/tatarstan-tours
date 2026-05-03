// Pusher trigger endpoint для отправки сообщений
import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';
import { publishUserNotification } from '@/lib/pusher/user-notification';
import { rateLimit } from '@/lib/security/rate-limit';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, { windowMs: 60_000, maxRequests: 50 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((limiter.resetTime - Date.now()) / 1000).toString() } }
      );
    }

    console.log('[Pusher Trigger] Starting message creation...');
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Pusher Trigger] Auth error:', authError);
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    console.log('[Pusher Trigger] User authenticated:', user.id);

    const body = await request.json();
    const { roomId, message, imageUrl, imagePath } = body;
    console.log('[Pusher Trigger] Request data:', { roomId, hasMessage: !!message, hasImage: !!imageUrl });

    if (!roomId || (!message && !imageUrl)) {
      console.error('[Pusher Trigger] Validation error: missing roomId or both message and imageUrl');
      return NextResponse.json(
        { error: 'Необходимы roomId и message или imageUrl' },
        { status: 400 }
      );
    }

    // Проверяем доступ к комнате
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', roomId)
      .single();

    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // Санитизируем текст сообщения для защиты от XSS
    let sanitizedMessage: string | null = null;
    if (message && typeof message === 'string' && message.trim().length > 0) {
      const sanitized = sanitizeText(message.trim());
      sanitizedMessage = sanitized.length > 0 ? sanitized : null;
    }
    console.log('[Pusher Trigger] Sanitized message:', sanitizedMessage ? 'has text' : 'no text', 'has image:', !!imageUrl);

    // Создаем сообщение в БД
    console.log('[Pusher Trigger] Inserting message to DB...');
    
    // Если нет текста и нет изображения - ошибка (но это уже проверено выше)
    // Если только изображение без текста - используем пустую строку вместо null для message
    const insertData: any = {
      room_id: roomId,
      user_id: user.id,
      message: sanitizedMessage || '', // Используем пустую строку вместо null, если только фото
      image_url: imageUrl || null,
      image_path: imagePath || null,
    };
    
    console.log('[Pusher Trigger] Insert data:', { 
      room_id: insertData.room_id,
      user_id: insertData.user_id,
      message: insertData.message || '(empty)',
      has_image_url: !!insertData.image_url,
      has_image_path: !!insertData.image_path
    });

    let newMessage: any = null;
    let createError: any = null;

    try {
      const result = await serviceClient
        .from('tour_room_messages')
        .insert(insertData)
        .select(`
          id,
          room_id,
          user_id,
          message,
          image_url,
          image_path,
          created_at,
          deleted_at,
          user:profiles!tour_room_messages_user_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();
      
      newMessage = result.data;
      createError = result.error;
    } catch (err: any) {
      createError = err;
      console.error('[Pusher Trigger] Exception during insert:', err);
    }

    if (createError || !newMessage) {
      console.error('[Pusher Trigger] Error creating message:', createError);
      console.error('[Pusher Trigger] Error details:', JSON.stringify(createError, null, 2));
      console.error('[Pusher Trigger] Error code:', createError?.code);
      console.error('[Pusher Trigger] Error message:', createError?.message);
      console.error('[Pusher Trigger] Error hint:', createError?.hint);
      
      // Проверяем, не связана ли ошибка с отсутствующими полями
      if (createError?.message?.includes('column') && createError?.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Не удалось создать сообщение', 
            details: 'Миграция 018 не применена. Поля image_url и image_path отсутствуют в таблице tour_room_messages. Примените миграцию supabase/migrations/018_add_message_images_and_auto_delete.sql',
            migration_required: true
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Не удалось создать сообщение', details: createError?.message || createError?.hint || 'Unknown error' },
        { status: 500 }
      );
    }
    console.log('[Pusher Trigger] Message created successfully:', newMessage.id);

    // Уведомляем остальных участников комнаты о новом сообщении
    try {
      const { data: senderProfile } = await serviceClient
        .from('profiles')
        .select('username, first_name, last_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const senderLabel =
        senderProfile?.username ||
        [senderProfile?.first_name, senderProfile?.last_name].filter(Boolean).join(' ') ||
        'Пользователь';

      const previewBase = imageUrl ? 'Отправил(а) изображение' : sanitizedMessage || 'Новое сообщение';
      const preview = previewBase.length > 100 ? `${previewBase.slice(0, 100)}...` : previewBase;

      const [participantsResult, roomResult] = await Promise.all([
        serviceClient
          .from('tour_room_participants')
          .select('user_id')
          .eq('room_id', roomId),
        serviceClient
          .from('tour_rooms')
          .select('guide_id')
          .eq('id', roomId)
          .maybeSingle(),
      ]);

      const recipientIds = new Set<string>();
      for (const row of participantsResult.data || []) {
        const uid = (row as { user_id?: string }).user_id;
        if (uid && uid !== user.id) recipientIds.add(uid);
      }
      const guideId = (roomResult.data as { guide_id?: string | null } | null)?.guide_id;
      if (guideId && guideId !== user.id) recipientIds.add(guideId);

      const recipients = Array.from(recipientIds);
      if (recipients.length > 0) {
        const body = [
          `${senderLabel}: ${preview}`,
          `sender_username:${senderProfile?.username || senderLabel}`,
          `sender_avatar:${senderProfile?.avatar_url || ''}`,
          `room_id:${roomId}`,
        ].join('\n');

        const { data: notifRows, error: notifErr } = await serviceClient
          .from('notifications')
          .insert(
            recipients.map((uid) => ({
              user_id: uid,
              title: 'Новое сообщение в комнате тура',
              body,
              type: 'tour_room_message',
            }))
          )
          .select('id, user_id, title, body, type, created_at');

        if (notifErr) {
          console.error('[Pusher Trigger] Notification insert error:', notifErr);
        } else if (notifRows?.length) {
          await Promise.all(
            notifRows.map((row: any) => publishUserNotification(row.user_id, row))
          );
        }
      }
    } catch (notifError) {
      console.error('[Pusher Trigger] Tour room notification error:', notifError);
    }

    // Отправляем событие через Pusher (публичный канал)
    console.log('[Pusher Trigger] Triggering Pusher event...');
    try {
      await pusher.trigger(
        `tour-room-${roomId}`,
        'new-message',
        {
          message: newMessage,
        }
      );
      console.log('[Pusher Trigger] Pusher event triggered successfully');
    } catch (pusherError) {
      console.error('[Pusher Trigger] Pusher error:', pusherError);
      // Не прерываем выполнение, сообщение уже создано в БД
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('[Pusher Trigger] Unexpected error:', error);
    console.error('[Pusher Trigger] Error stack:', error?.stack);
    console.error('[Pusher Trigger] Error message:', error?.message);
    return NextResponse.json(
      { error: 'Ошибка отправки сообщения', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


