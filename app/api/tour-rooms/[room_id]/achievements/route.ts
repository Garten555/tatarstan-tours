// API для выдачи достижений участникам тура (админ/гид)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

// POST /api/tour-rooms/[room_id]/achievements - выдача достижения участнику
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const { room_id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем комнату и проверяем права
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id, tour_id, tour:tours(id, title, category)')
      .eq('id', room_id)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'tour_admin' || profile?.role === 'super_admin';
    const isGuide = (room as any).guide_id === user.id;

    if (!isAdmin && !isGuide) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем данные запроса
    const { user_id, badge_type, badge_name, badge_description } = await request.json();

    if (!user_id || !badge_type || !badge_name) {
      return NextResponse.json(
        { error: 'Необходимы user_id, badge_type и badge_name' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником комнаты
    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user_id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Пользователь не является участником этого тура' },
        { status: 403 }
      );
    }

    // Выдаем достижение
    const { data: achievement, error } = await serviceClient
      .from('achievements')
      .insert({
        user_id,
        badge_type,
        badge_name,
        badge_description: badge_description || null,
        tour_id: (room as any).tour_id || null,
      })
      .select()
      .single();

    if (error) {
      // Если достижение уже существует (конфликт уникальности)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Достижение уже выдано этому пользователю' },
          { status: 409 }
        );
      }
      
      console.error('Ошибка выдачи достижения:', error);
      return NextResponse.json(
        { error: 'Не удалось выдать достижение' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      achievement,
      message: 'Достижение успешно выдано',
    });
  } catch (error) {
    console.error('Error in POST /api/tour-rooms/[room_id]/achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/tour-rooms/[room_id]/achievements - получить список доступных достижений
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const { room_id } = await params;
    
    // Rate limiting
    const rateLimitResult = rateLimit(request, { windowMs: 60000, maxRequests: 100 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': '60',
          }
        }
      );
    }
    
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем комнату
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id, tour_id, tour:tours(id, title, category)')
      .eq('id', room_id)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    // Проверяем права админа/гида
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'tour_admin' || profile?.role === 'super_admin';
    const isGuide = (room as any).guide_id === user.id;

    if (!isAdmin && !isGuide) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Список доступных достижений для выдачи (офлайн достижения во время туров)
    const availableAchievements = [
      { badge_type: 'offline_participation', badge_name: 'Активный участник', badge_description: 'Активно участвовал в туре, задавал вопросы, проявлял интерес' },
      { badge_type: 'helpful', badge_name: 'Помощник', badge_description: 'Помогал другим участникам во время тура' },
      { badge_type: 'photographer', badge_name: 'Фотограф', badge_description: 'Делал отличные фотографии во время тура' },
      { badge_type: 'social', badge_name: 'Душа компании', badge_description: 'Создавал дружескую атмосферу в группе' },
      { badge_type: 'punctual', badge_name: 'Пунктуальный', badge_description: 'Всегда приходил вовремя на все точки маршрута' },
      { badge_type: 'enthusiast', badge_name: 'Энтузиаст', badge_description: 'Проявил особый интерес к истории и культуре' },
      { badge_type: 'explorer', badge_name: 'Исследователь', badge_description: 'Активно исследовал достопримечательности' },
      { badge_type: 'team_player', badge_name: 'Командный игрок', badge_description: 'Отлично работал в команде' },
      { badge_type: 'curious', badge_name: 'Любознательный', badge_description: 'Задавал интересные вопросы гиду' },
      { badge_type: 'respectful', badge_name: 'Уважительный', badge_description: 'Проявил уважение к культуре и традициям' },
      { badge_type: 'energetic', badge_name: 'Энергичный', badge_description: 'Проявил высокую активность на протяжении всего тура' },
      { badge_type: 'memory_keeper', badge_name: 'Хранитель воспоминаний', badge_description: 'Делал заметки и записывал интересные факты' },
    ];

    return NextResponse.json({
      success: true,
      achievements: availableAchievements,
    });
  } catch (error) {
    console.error('Error in GET /api/tour-rooms/[room_id]/achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

