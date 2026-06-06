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

    const { data: bookings, error } = await serviceClient
      .from('bookings')
      .select(`
        id,
        tour_id,
        session_id,
        status,
        payment_status,
        total_price,
        num_people,
        payment_method,
        created_at,
        departure_end_at,
        departure_start_at,
        tour:tours!bookings_tour_id_fkey(
          id,
          title,
          slug,
          start_date,
          end_date,
          cover_image,
          yandex_map_url,
          status,
          city:cities(id, name)
        ),
        tour_session:tour_sessions!bookings_session_id_fkey(
          start_at,
          end_at
        ),
        review:reviews!reviews_booking_id_fkey(
          id,
          rating
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[admin user bookings]', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить бронирования' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error('[admin user bookings]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
