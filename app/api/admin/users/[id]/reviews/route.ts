import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const admin = await requireAdminRole(supabase);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { data: reviews, error } = await serviceClient
      .from('reviews')
      .select(`
        id,
        rating,
        text,
        created_at,
        tour:tours!reviews_tour_id_fkey(
          id,
          title,
          slug,
          cover_image,
          status,
          end_date,
          start_date
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[admin user reviews]', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить отзывы' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error) {
    console.error('[admin user reviews]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
