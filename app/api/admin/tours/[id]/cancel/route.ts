import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendTourCancelledEmail } from '@/lib/email/tour-notifications';

/**
 * POST /api/admin/tours/[id]/cancel — отменить тур (не удалять): статус cancelled + отмена активных бронирований + письма участникам.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = (profile as { role?: string | null } | null)?.role;
    if (role !== 'tour_admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.reason === 'string') reason = body.reason.trim() || undefined;
    } catch {
      /* empty body */
    }

    const { data: tour, error: tourErr } = await serviceClient
      .from('tours')
      .select('id, title, status')
      .eq('id', tourId)
      .single();

    if (tourErr || !tour) {
      return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
    }

    if ((tour as { status?: string }).status === 'cancelled') {
      return NextResponse.json({ error: 'Тур уже отменён' }, { status: 400 });
    }

    const tourTitle = String((tour as { title?: string }).title || 'Тур');

    const { data: bookings } = await serviceClient
      .from('bookings')
      .select('id, user_id, status')
      .eq('tour_id', tourId)
      .in('status', ['pending', 'confirmed']);

    const userIds = [...new Set((bookings || []).map((b: { user_id: string }) => b.user_id))];

    const { data: profiles } =
      userIds.length > 0
        ? await serviceClient.from('profiles').select('email').in('id', userIds)
        : { data: [] as { email: string }[] };

    const emails = [...new Set((profiles || []).map((p) => p.email).filter(Boolean))];

    const { error: upBook } = await serviceClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('tour_id', tourId)
      .in('status', ['pending', 'confirmed']);

    if (upBook) {
      console.error('[tour/cancel] bookings', upBook);
      return NextResponse.json({ error: 'Не удалось обновить бронирования', details: upBook.message }, { status: 500 });
    }

    await serviceClient.from('tour_sessions').update({ status: 'cancelled' }).eq('tour_id', tourId);

    const { error: upTour } = await serviceClient.from('tours').update({ status: 'cancelled' }).eq('id', tourId);

    if (upTour) {
      console.error('[tour/cancel] tour', upTour);
      return NextResponse.json({ error: 'Не удалось отменить тур', details: upTour.message }, { status: 500 });
    }

    void Promise.allSettled(
      emails.map((to) => sendTourCancelledEmail({ to, tourTitle, reason }))
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/admin/tours/[id]/cancel', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
