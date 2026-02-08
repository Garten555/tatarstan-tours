// API для работы с сообщениями в комнатах туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';

// GET /api/tour-rooms/[room_id]/messages
// Получить сообщения комнаты (с пагинацией)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;

    // Проверка авторизации
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

    // Получаем комнату для проверки guide_id
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', room_id)
      .single();

    // Проверяем доступ к комнате: участник, гид или админ
    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .single();

    // Проверяем права админа
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

    // Получаем параметры пагинации
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100'); // Увеличиваем лимит для чата
    const page = 1; // Для чата всегда первая страница

    // Оптимизировано: получаем сообщения с профилями пользователей одним запросом
    // Используем более эффективный запрос без лишних полей
    const { data: messages, error: messagesError } = await serviceClient
      .from('tour_room_messages')
      .select(`
        id,
        room_id,
        user_id,
        message,
        image_url,
        image_path,
        created_at,
        deleted_at,
        user:profiles!inner(id, first_name, last_name, avatar_url)
      `)
      .eq('room_id', room_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messagesError) {
      console.error('Ошибка получения сообщений:', messagesError);
      return NextResponse.json(
        { error: 'Не удалось получить сообщения' },
        { status: 500 }
      );
    }

    // Оптимизировано: не используем count: 'exact' (медленно)
    // Используем приблизительное количество на основе загруженных данных
    const estimatedTotal = messages ? messages.length : 0;

    return NextResponse.json({
      success: true,
      messages: messages?.reverse() || [], // Переворачиваем для отображения от старых к новым
      pagination: {
        page,
        limit,
        total: estimatedTotal,
        totalPages: Math.ceil(estimatedTotal / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/tour-rooms/[room_id]/messages
// Отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;

    // Проверка авторизации
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

    // Оптимизировано: параллельные запросы для проверки доступа
    const [roomResult, participantResult, profileResult] = await Promise.all([
      serviceClient
        .from('tour_rooms')
        .select('guide_id')
        .eq('id', room_id)
        .single(),
      serviceClient
        .from('tour_room_participants')
        .select('id')
        .eq('room_id', room_id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('role, is_banned, ban_until, ban_reason')
        .eq('id', user.id)
        .single(),
    ]);

    const { data: room } = roomResult;
    const { data: participant } = participantResult;
    const { data: profile } = profileResult;

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';

    if (!isAdmin && profile?.is_banned) {
      if (profile.ban_until) {
        const until = new Date(profile.ban_until);
        if (until.getTime() <= Date.now()) {
          await serviceClient
            .from('profiles')
            .update({ is_banned: false, ban_until: null, ban_reason: null, banned_at: null })
            .eq('id', user.id);
        } else {
          return NextResponse.json(
            { error: profile.ban_reason || 'Вы заблокированы', ban_until: profile.ban_until },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: profile.ban_reason || 'Вы заблокированы' },
          { status: 403 }
        );
      }
    }

    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, imageUrl, imagePath } = body;

    // Проверяем что есть либо сообщение, либо изображение
    if ((!message || message.trim().length === 0) && !imageUrl) {
      return NextResponse.json(
        { error: 'Сообщение или изображение обязательны' },
        { status: 400 }
      );
    }

    // Санитизируем текст сообщения для защиты от XSS
    const sanitizedMessage = message ? sanitizeText(message.trim()) : null;

    // Ограничение длины сообщения
    if (sanitizedMessage && sanitizedMessage.length > 2000) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное (максимум 2000 символов)' },
        { status: 400 }
      );
    }

    // Создаем сообщение
    const { data: newMessage, error: createError } = await serviceClient
      .from('tour_room_messages')
      .insert({
        room_id,
        user_id: user.id,
        message: sanitizedMessage,
        image_url: imageUrl || null,
        image_path: imagePath || null,
      })
      .select(`
        id,
        room_id,
        user_id,
        message,
        image_url,
        image_path,
        created_at,
        deleted_at,
        user:profiles(id, first_name, last_name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('Ошибка создания сообщения:', createError);
      return NextResponse.json(
        { error: 'Не удалось отправить сообщение' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

