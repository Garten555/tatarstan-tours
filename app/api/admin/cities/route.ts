// API для работы с городами
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Динамический роут (использует searchParams)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const supabase = await createServiceClient();

    let query = supabase
      .from('cities')
      .select('id, name')
      .order('name', { ascending: true });

    // Если есть поисковый запрос, фильтруем
    if (search.length >= 2) {
      query = query.ilike('name_lower', `%${search}%`);
    }

    // Ограничиваем количество результатов
    query = query.limit(20);

    const { data: cities, error } = await query;

    if (error) {
      console.error('Ошибка загрузки городов:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить города' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cities: cities || [],
    });
  } catch (error) {
    console.error('Ошибка API городов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}














