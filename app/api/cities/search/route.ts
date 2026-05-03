/** Публичный поиск городов для постов/форм (не только админка). */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
    if (q.length < 2) {
      return NextResponse.json({ cities: [] });
    }

    const serviceClient = createServiceClient();
    const { data: cities, error } = await serviceClient
      .from('cities')
      .select('id, name')
      .ilike('name_lower', `%${q}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      console.error('[cities/search]', error);
      return NextResponse.json({ error: 'Не удалось загрузить города' }, { status: 500 });
    }

    return NextResponse.json({ cities: cities || [] });
  } catch (e) {
    console.error('[cities/search]', e);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
