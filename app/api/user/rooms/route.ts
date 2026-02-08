// API для получения всех комнат пользователя (как участника и как гида)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Rooms API] Request received');
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    
    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[User Rooms API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    console.log('[User Rooms API] User authenticated:', user.id);

    // Получаем комнаты параллельно
    const [participantResult, guideResult] = await Promise.all([
      // Участник: сначала получаем room_id
      serviceClient
        .from('tour_room_participants')
        .select('room_id')
        .eq('user_id', user.id)
        .then(async (result) => {
          if (result.error || !result.data || result.data.length === 0) {
            return { data: [], error: result.error };
          }
          const roomIds = result.data.map((p: any) => p.room_id);
          const roomsResult = await serviceClient
            .from('tour_rooms')
            .select(`
              id,
              tour_id,
              guide_id,
              is_active,
              created_at,
              tour:tours(id, title, slug, start_date, end_date, cover_image),
              guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .in('id', roomIds);
          
          // Загружаем города отдельно для оптимизации
          if (roomsResult.data) {
            const tourIds = roomsResult.data.map((r: any) => r.tour?.id).filter(Boolean);
            if (tourIds.length > 0) {
              const { data: toursWithCities } = await serviceClient
                .from('tours')
                .select('id, city:cities(name)')
                .in('id', tourIds);
              
              if (toursWithCities) {
                const cityMap = new Map(toursWithCities.map((t: any) => [t.id, t.city]));
                roomsResult.data.forEach((room: any) => {
                  if (room.tour) {
                    room.tour.city = cityMap.get(room.tour.id);
                  }
                });
              }
            }
          }
          return { data: roomsResult.data?.map((r: any) => ({ room_id: r.id, room: r })) || [], error: roomsResult.error };
        }),
      // Гид: получаем комнаты напрямую
      serviceClient
        .from('tour_rooms')
        .select(`
          id,
          tour_id,
          guide_id,
          is_active,
          created_at,
          tour:tours(id, title, slug, start_date, end_date, cover_image),
          guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('guide_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(async (result) => {
          // Загружаем города отдельно
          if (result.data) {
            const tourIds = result.data.map((r: any) => r.tour?.id).filter(Boolean);
            if (tourIds.length > 0) {
              const { data: toursWithCities } = await serviceClient
                .from('tours')
                .select('id, city:cities(name)')
                .in('id', tourIds);
              
              if (toursWithCities) {
                const cityMap = new Map(toursWithCities.map((t: any) => [t.id, t.city]));
                result.data.forEach((room: any) => {
                  if (room.tour) {
                    room.tour.city = cityMap.get(room.tour.id);
                  }
                });
              }
            }
          }
          return result;
        }),
    ]);

    const participantRooms = participantResult.data || [];
    const participantError = participantResult.error;
    const guideRooms = guideResult.data || [];
    const guideError = guideResult.error;

    if (participantError) {
      console.error('[User Rooms API] Participant rooms error:', participantError);
    }
    if (guideError) {
      console.error('[User Rooms API] Guide rooms error:', guideError);
    }

    // Продолжаем даже если есть ошибки (может быть просто нет комнат)
    console.log('[User Rooms API] Participant rooms found:', participantRooms?.length || 0);
    console.log('[User Rooms API] Guide rooms found:', guideRooms?.length || 0);

    // Объединяем комнаты и убираем дубликаты
    const roomsMap = new Map<string, any>();
    
    // Добавляем комнаты где пользователь участник
    if (participantRooms && Array.isArray(participantRooms)) {
      participantRooms.forEach((pr: any) => {
        if (pr && pr.room && pr.room.id) {
          roomsMap.set(pr.room.id, {
            ...pr.room,
            role: 'participant',
          });
        }
      });
    }
    
    // Добавляем комнаты где пользователь гид (перезаписывает если уже есть)
    if (guideRooms && Array.isArray(guideRooms)) {
      guideRooms.forEach((gr: any) => {
        if (gr && gr.id) {
          roomsMap.set(gr.id, {
            ...gr,
            role: 'guide',
          });
        }
      });
    }

    // Получаем счетчики участников для всех комнат
    const roomIds = Array.from(roomsMap.keys());
    let participantsCounts: Record<string, number> = {};
    
    if (roomIds.length > 0) {
      const { data: participantsData } = await serviceClient
        .from('tour_room_participants')
        .select('room_id')
        .in('room_id', roomIds);
      
      if (participantsData) {
        participantsData.forEach((p: any) => {
          participantsCounts[p.room_id] = (participantsCounts[p.room_id] || 0) + 1;
        });
      }
    }

    // Формируем финальный список комнат
    const rooms = Array.from(roomsMap.values())
      .filter((room: any) => room && room.id) // Фильтруем валидные комнаты
      .map((room: any) => ({
        id: room.id,
        tour_id: room.tour_id,
        guide_id: room.guide_id,
        is_active: room.is_active,
        created_at: room.created_at || new Date().toISOString(),
        role: room.role, // 'participant' или 'guide'
        tour: room.tour,
        guide: room.guide,
        participants_count: participantsCounts[room.id] || 0,
      }));

    const sortedRooms = rooms.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    console.log('[User Rooms API] Returning rooms:', sortedRooms.length);

    return NextResponse.json({
      success: true,
      rooms: sortedRooms,
    });
  } catch (error) {
    console.error('Ошибка получения комнат пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

