import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/admin/tours/[id]/duplicate - дублирование тура на несколько дней
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Проверяем права
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const pad2 = (value: number) => value.toString().padStart(2, '0');
    const formatSlugDate = (date: Date) =>
      `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}`;

    const ensureUniqueSlug = async (baseSlug: string) => {
      let candidate = baseSlug;
      let suffix = 1;
      while (true) {
        const { data: existingTour } = await serviceClient
          .from('tours')
          .select('id')
          .eq('slug', candidate)
          .single();
        if (!existingTour) return candidate;
        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
    };

    // Получаем параметры из запроса
    const body = await request.json();
    const { days = 1, startFromNextDay = true, dates } = body || {};

    if (!Array.isArray(dates)) {
      if (days < 1 || days > 30) {
        return NextResponse.json(
          { error: 'Количество дней должно быть от 1 до 30' },
          { status: 400 }
        );
      }
    }

    // Загружаем исходный тур
    const { data: originalTour, error: tourError } = await serviceClient
      .from('tours')
      .select('*')
      .eq('id', id)
      .single();

    if (tourError || !originalTour) {
      return NextResponse.json(
        { error: 'Тур не найден' },
        { status: 404 }
      );
    }

    // Загружаем медиа исходного тура
    const { data: originalMedia } = await serviceClient
      .from('tour_media')
      .select('*')
      .eq('tour_id', id);

    const tour = originalTour as any;
    const media = (originalMedia || []) as any[];

    const tourStartDate = new Date(tour.start_date);
    const tourEndDate = tour.end_date ? new Date(tour.end_date) : new Date(tour.start_date);
    const tourDuration = tourEndDate.getTime() - tourStartDate.getTime();

    let rangesToCreate: Array<{ start: Date; end: Date }> = [];

    if (Array.isArray(dates) && dates.length > 0) {
      for (const range of dates) {
        const start = new Date(range?.start_date);
        const end = new Date(range?.end_date);
        if (!range?.start_date || !range?.end_date || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return NextResponse.json(
            { error: 'Неверный формат дат' },
            { status: 400 }
          );
        }
        if (end <= start) {
          return NextResponse.json(
            { error: 'Дата окончания должна быть позже даты начала' },
            { status: 400 }
          );
        }
        rangesToCreate.push({ start, end });
      }
    } else {
      const baseStartDate = startFromNextDay 
        ? new Date(tourEndDate)
        : new Date(tourStartDate);
      
      if (startFromNextDay) {
        baseStartDate.setDate(baseStartDate.getDate() + 1);
      }

      for (let i = 0; i < days; i++) {
        const newStartDate = new Date(baseStartDate);
        newStartDate.setDate(baseStartDate.getDate() + i);
        const newEndDate = new Date(newStartDate.getTime() + tourDuration);
        rangesToCreate.push({ start: newStartDate, end: newEndDate });
      }
    }

    const createdTours: any[] = [];

    for (const [index, range] of rangesToCreate.entries()) {
      const newStartDate = range.start;
      const newEndDate = range.end;

      const baseSlug = `${tour.slug}-${formatSlugDate(newStartDate)}`;
      const newSlug = await ensureUniqueSlug(baseSlug);

      // Создаем новый тур
      const newTourData = {
        title: tour.title,
        slug: newSlug,
        description: tour.description,
        short_desc: tour.short_desc,
        full_desc: tour.full_desc,
        cover_image: tour.cover_image,
        cover_path: tour.cover_path,
        price_per_person: tour.price_per_person,
        tour_type: tour.tour_type,
        category: tour.category,
        start_date: newStartDate.toISOString(),
        end_date: newEndDate.toISOString(),
        max_participants: tour.max_participants,
        status: tour.status === 'completed' ? 'draft' : tour.status, // Завершенные туры создаем как черновики
        yandex_map_url: tour.yandex_map_url,
        yandex_map_data: tour.yandex_map_data,
        city_id: tour.city_id,
        created_by: user.id,
      };

      const { data: newTour, error: createError } = await (serviceClient as any)
        .from('tours')
        .insert(newTourData)
        .select()
        .single();

      if (createError) {
        console.error(`Ошибка создания тура для дня ${index + 1}:`, createError);
        continue;
      }

      // Копируем медиа
      if (media.length > 0) {
        const mediaToInsert = media.map((m) => ({
          tour_id: newTour.id,
          media_type: m.media_type,
          media_url: m.media_url,
          media_path: m.media_path,
          thumbnail_url: m.thumbnail_url,
          order_index: m.order_index,
        }));

        await (serviceClient as any)
          .from('tour_media')
          .insert(mediaToInsert);
      }

      createdTours.push(newTour);
    }

    return NextResponse.json({
      success: true,
      message: `Создано туров: ${createdTours.length} из ${rangesToCreate.length}`,
      created: createdTours.length,
      requested: rangesToCreate.length,
      tours: createdTours,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/tours/[id]/duplicate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

