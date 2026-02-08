import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверка прав
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if ((profile as any)?.role !== 'tour_admin' && (profile as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Параметры фильтрации
    const search = sanitizeText(searchParams.get('search') || '').trim();
    const status = sanitizeText(searchParams.get('status') || '').trim();
    const tourType = sanitizeText(searchParams.get('tour_type') || '').trim();
    const category = sanitizeText(searchParams.get('category') || '').trim();
    const sortBy = sanitizeText(searchParams.get('sort_by') || 'created_at').trim();
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '12')), 50);
    const offset = (page - 1) * limit;

    // Начинаем запрос
    let query = serviceClient
      .from('tours')
      .select(`
        id,
        title,
        slug,
        price_per_person,
        tour_type,
        category,
        start_date,
        end_date,
        status,
        current_participants,
        max_participants,
        cover_image,
        created_at
      `, { count: 'exact' });

    // Поиск по названию
    if (search) {
      const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`title.ilike.%${escapedSearch}%,short_desc.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }

    // Фильтр по статусу
    if (status) {
      query = query.eq('status', status);
    }

    // Фильтр по типу тура
    if (tourType) {
      query = query.eq('tour_type', tourType);
    }

    // Фильтр по категории
    if (category) {
      query = query.eq('category', category);
    }

    // Сортировка
    const validSortFields = ['created_at', 'title', 'price_per_person', 'start_date', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Пагинация
    query = query.range(offset, offset + limit - 1);

    const { data: tours, error, count } = await query;

    if (error) {
      console.error('Ошибка загрузки туров:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить туры' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      tours: tours || [],
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Ошибка API фильтрации туров в админке:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

