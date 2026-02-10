// API для приватных сообщений между пользователями
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

// GET /api/users/messages - Получить список бесед или сообщения конкретной беседы
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const conversationWith = searchParams.get('with'); // ID пользователя для получения сообщений конкретной беседы

    if (conversationWith) {
      // Получаем сообщения конкретной беседы
      const user1_id = user.id < conversationWith ? user.id : conversationWith;
      const user2_id = user.id < conversationWith ? conversationWith : user.id;

      const { data: messages, error } = await serviceClient
        .from('user_messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          message,
          image_url,
          is_read,
          read_at,
          created_at,
          sender:profiles!user_messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          recipient:profiles!user_messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(sender_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки сообщений:', error);
        return NextResponse.json(
          { error: 'Не удалось загрузить сообщения' },
          { status: 500 }
        );
      }

      // Помечаем сообщения как прочитанные
      const unreadMessageIds = (messages || [])
        .filter((msg: any) => msg.recipient_id === user.id && !msg.is_read)
        .map((msg: any) => msg.id);

      if (unreadMessageIds.length > 0) {
        await serviceClient
          .from('user_messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .in('id', unreadMessageIds);
      }

      return NextResponse.json({
        success: true,
        messages: messages || [],
      });
    } else {
      // Получаем список всех бесед пользователя
      const { data: conversations, error } = await serviceClient
        .from('user_conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          last_message_id,
          last_message_text,
          last_message_at,
          unread_count_user1,
          unread_count_user2,
          pinned_by_user1,
          pinned_by_user2,
          archived_by_user1,
          archived_by_user2,
          updated_at,
          user1:profiles!user_conversations_user1_id_fkey(
            id,
            username,
            display_name,
            first_name,
            last_name,
            avatar_url
          ),
          user2:profiles!user_conversations_user2_id_fkey(
            id,
            username,
            display_name,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки бесед:', error);
        return NextResponse.json(
          { error: 'Не удалось загрузить беседы' },
          { status: 500 }
        );
      }

      // Преобразуем данные: определяем собеседника
      const formattedConversations = (conversations || []).map((conv: any) => {
        const isUser1 = conv.user1_id === user.id;
        const otherUser = isUser1 ? conv.user2 : conv.user1;
        const unreadCount = isUser1 ? conv.unread_count_user1 : conv.unread_count_user2;
        const isPinned = isUser1 ? conv.pinned_by_user1 : conv.pinned_by_user2;
        const isArchived = isUser1 ? conv.archived_by_user1 : conv.archived_by_user2;

        return {
          id: conv.id,
          other_user: otherUser,
          last_message_text: conv.last_message_text,
          last_message_at: conv.last_message_at,
          unread_count: unreadCount,
          is_pinned: isPinned,
          is_archived: isArchived,
          updated_at: conv.updated_at,
        };
      });

      return NextResponse.json({
        success: true,
        conversations: formattedConversations,
      });
    }
  } catch (error: any) {
    console.error('Ошибка загрузки сообщений:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/users/messages - Отправить сообщение
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipient_id, message, image_url, image_path } = body;

    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Не указан получатель' },
        { status: 400 }
      );
    }

    if (!message && !image_url) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      );
    }

    if (recipient_id === user.id) {
      return NextResponse.json(
        { error: 'Нельзя отправить сообщение самому себе' },
        { status: 400 }
      );
    }

    // Проверяем настройки приватности получателя
    const { data: privacySettings } = await serviceClient
      .from('user_message_privacy')
      .select('who_can_message')
      .eq('user_id', recipient_id)
      .single();

    if (privacySettings?.who_can_message === 'nobody') {
      return NextResponse.json(
        { error: 'Пользователь не принимает сообщения' },
        { status: 403 }
      );
    }

    if (privacySettings?.who_can_message === 'friends') {
      // Проверяем, являются ли пользователи друзьями
      const user1_id = user.id < recipient_id ? user.id : recipient_id;
      const user2_id = user.id < recipient_id ? recipient_id : user.id;

      const { data: friendship } = await serviceClient
        .from('user_friends')
        .select('status')
        .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json(
          { error: 'Можно писать только друзьям' },
          { status: 403 }
        );
      }
    }

    // Проверяем, не заблокирован ли отправитель
    const user1_id = user.id < recipient_id ? user.id : recipient_id;
    const user2_id = user.id < recipient_id ? recipient_id : user.id;

    const { data: blocked } = await serviceClient
      .from('user_friends')
      .select('status')
      .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
      .eq('status', 'blocked')
      .maybeSingle();

    if (blocked) {
      return NextResponse.json(
        { error: 'Пользователь заблокирован' },
        { status: 403 }
      );
    }

    // Создаем сообщение
    const { data: newMessage, error } = await serviceClient
      .from('user_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipient_id,
        message: message || null,
        image_url: image_url || null,
        image_path: image_path || null,
      })
      .select(`
        *,
        sender:profiles!user_messages_sender_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        recipient:profiles!user_messages_recipient_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Ошибка отправки сообщения:', error);
      return NextResponse.json(
        { error: 'Не удалось отправить сообщение' },
        { status: 500 }
      );
    }

    // Отправляем через Pusher получателю
    try {
      await pusher.trigger(`user-${recipient_id}`, 'new-message', {
        message: newMessage,
      });
    } catch (pusherError) {
      console.error('Ошибка Pusher:', pusherError);
      // Не прерываем выполнение, сообщение уже сохранено
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/messages - Обновить сообщение (прочитать, удалить)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message_id, action } = body; // action: 'read', 'delete'

    if (!message_id || !action) {
      return NextResponse.json(
        { error: 'Не указан ID сообщения или действие' },
        { status: 400 }
      );
    }

    // Получаем сообщение
    const { data: message } = await serviceClient
      .from('user_messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: 'Сообщение не найдено' },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (message.sender_id !== user.id && message.recipient_id !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к этому сообщению' },
        { status: 403 }
      );
    }

    if (action === 'read') {
      // Помечаем как прочитанное
      if (message.recipient_id !== user.id) {
        return NextResponse.json(
          { error: 'Можно прочитать только полученные сообщения' },
          { status: 400 }
        );
      }

      const { error } = await serviceClient
        .from('user_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', message_id);

      if (error) {
        console.error('Ошибка обновления сообщения:', error);
        return NextResponse.json(
          { error: 'Не удалось обновить сообщение' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    } else if (action === 'delete') {
      // Мягкое удаление
      const { error } = await serviceClient
        .from('user_messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', message_id);

      if (error) {
        console.error('Ошибка удаления сообщения:', error);
        return NextResponse.json(
          { error: 'Не удалось удалить сообщение' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Неизвестное действие' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Ошибка обновления сообщения:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}












