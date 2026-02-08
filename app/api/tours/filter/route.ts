import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';

// Динамический роут (использует searchParams)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    // Параметры фильтрации с санитизацией
    const search = sanitizeText(searchParams.get('search') || '').trim();
    const tourType = sanitizeText(searchParams.get('tour_type') || '').trim();
    const category = sanitizeText(searchParams.get('category') || '').trim();
    const cityId = sanitizeText(searchParams.get('city_id') || '').trim();
    const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : null;
    const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : null;
    const startDate = sanitizeText(searchParams.get('start_date') || '').trim();
    const endDate = sanitizeText(searchParams.get('end_date') || '').trim();
    const sortBy = sanitizeText(searchParams.get('sort_by') || 'created_at').trim();
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '12')), 50); // Максимум 50, минимум 1
    const offset = (page - 1) * limit;

    // Начинаем запрос
    const now = new Date().toISOString();
    let query = supabase
      .from('tours')
      .select(`
        id,
        title,
        slug,
        short_desc,
        cover_image,
        price_per_person,
        start_date,
        end_date,
        max_participants,
        current_participants,
        tour_type,
        category,
        status,
        city:cities(id, name),
        created_at
      `)
      .eq('status', 'active')
      // Исключаем завершенные туры (end_date < NOW())
      .or(`end_date.is.null,end_date.gte.${now}`);
    
    // Дополнительная фильтрация завершенных туров
    // Фильтруем: end_date IS NULL OR end_date >= NOW()
    // В Supabase используем правильный синтаксис для OR
    query = query.or(`end_date.is.null,end_date.gte.${now}`);

    // Поиск по названию, описанию и городу
    if (search) {
      // Экранируем специальные символы для ilike
      const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      
      // Сначала ищем города по названию (параллельно с поиском туров)
      const citiesPromise = supabase
        .from('cities')
        .select('id')
        .ilike('name', `%${escapedSearch}%`)
        .limit(50);
      
      // Ищем туры по тексту (название, описание)
      const textToursPromise = supabase
        .from('tours')
        .select('id, city_id')
        .eq('status', 'active')
        .or(`end_date.is.null,end_date.gte.${now}`)
        .or(`title.ilike.%${escapedSearch}%,short_desc.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
      
      const [citiesResult, textToursResult] = await Promise.all([citiesPromise, textToursPromise]);
      
      const cityIds = citiesResult.data?.map(c => c.id) || [];
      const textTourIds = textToursResult.data?.map(t => t.id) || [];
      
      // Находим туры по городам (если города найдены)
      let cityTourIds: string[] = [];
      if (cityIds.length > 0) {
        const cityToursResult = await supabase
          .from('tours')
          .select('id')
          .eq('status', 'active')
          .or(`end_date.is.null,end_date.gte.${now}`)
          .in('city_id', cityIds);
        
        cityTourIds = cityToursResult.data?.map(t => t.id) || [];
      }
      
      // Объединяем уникальные ID
      const allTourIds = [...new Set([...textTourIds, ...cityTourIds])];
      
      if (allTourIds.length > 0) {
        query = query.in('id', allTourIds);
      } else {
        // Если ничего не найдено, возвращаем пустой результат
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Несуществующий ID
      }
    }

    // Фильтр по типу тура
    if (tourType) {
      query = query.eq('tour_type', tourType);
    }

    // Фильтр по категории
    if (category) {
      query = query.eq('category', category);
    }

    // Фильтр по городу
    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    // Фильтр по цене
    if (minPrice !== null && minPrice >= 0) {
      query = query.gte('price_per_person', minPrice);
    }
    if (maxPrice !== null && maxPrice > 0) {
      query = query.lte('price_per_person', maxPrice);
    }

    // Фильтр по дате начала
    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    // Фильтр по дате окончания
    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    // Сортировка
    const validSortFields = ['created_at', 'price_per_person', 'start_date', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Пагинация
    query = query.range(offset, offset + limit - 1);

    const { data: tours, error } = await query;

    if (error) {
      console.error('Ошибка загрузки туров:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить туры' },
        { status: 500 }
      );
    }

    // Дополнительная фильтрация на уровне приложения
    // Исключаем туры где end_date < NOW() (завершенные туры)
    const currentTime = new Date();
    const activeTours = (tours || []).filter((tour: any) => {
      // Если end_date нет - показываем (бессрочный тур)
      if (!tour.end_date) return true;
      // Если end_date есть - проверяем что тур еще не закончился
      const endDate = new Date(tour.end_date);
      return endDate >= currentTime;
    });

    // Вычисляем доступные места
    const toursWithAvailability = activeTours.map((tour: any) => ({
      ...tour,
      available_spots: Math.max(0, tour.max_participants - (tour.current_participants || 0)),
      is_available: (tour.current_participants || 0) < tour.max_participants,
    }));

    // Подсчитываем общее количество туров для пагинации
    // Создаем запрос для подсчета без пагинации
    let countQuery = supabase
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${now}`);

    // Применяем те же фильтры что и к основному запросу
    if (search) {
      const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const citiesPromise = supabase
        .from('cities')
        .select('id')
        .ilike('name', `%${escapedSearch}%`)
        .limit(50);
      
      const textToursPromise = supabase
        .from('tours')
        .select('id, city_id')
        .eq('status', 'active')
        .or(`end_date.is.null,end_date.gte.${now}`)
        .or(`title.ilike.%${escapedSearch}%,short_desc.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
      
      const [citiesResult, textToursResult] = await Promise.all([citiesPromise, textToursPromise]);
      const cityIds = citiesResult.data?.map(c => c.id) || [];
      const textTourIds = textToursResult.data?.map(t => t.id) || [];
      
      let cityTourIds: string[] = [];
      if (cityIds.length > 0) {
        const cityToursResult = await supabase
          .from('tours')
          .select('id')
          .eq('status', 'active')
          .or(`end_date.is.null,end_date.gte.${now}`)
          .in('city_id', cityIds);
        cityTourIds = cityToursResult.data?.map(t => t.id) || [];
      }
      
      const allTourIds = [...new Set([...textTourIds, ...cityTourIds])];
      if (allTourIds.length > 0) {
        countQuery = countQuery.in('id', allTourIds);
      } else {
        countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (tourType) countQuery = countQuery.eq('tour_type', tourType);
    if (category) countQuery = countQuery.eq('category', category);
    if (cityId) countQuery = countQuery.eq('city_id', cityId);
    if (minPrice !== null && minPrice >= 0) countQuery = countQuery.gte('price_per_person', minPrice);
    if (maxPrice !== null && maxPrice > 0) countQuery = countQuery.lte('price_per_person', maxPrice);
    if (startDate) countQuery = countQuery.gte('start_date', startDate);
    if (endDate) countQuery = countQuery.lte('end_date', endDate);

    const { count } = await countQuery;
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      tours: toursWithAvailability,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Ошибка API фильтрации туров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

