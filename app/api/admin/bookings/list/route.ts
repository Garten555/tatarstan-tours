import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  getAdminBookingsSummary,
  listAdminBookings,
} from '@/lib/admin/admin-bookings-list';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (role !== 'tour_admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 50);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const payment_status = searchParams.get('payment_status') || 'all';
    const withSummary = searchParams.get('summary') === '1';

    const [listResult, summary] = await Promise.all([
      listAdminBookings(serviceClient, { page, limit, search, status, payment_status }),
      withSummary ? getAdminBookingsSummary(serviceClient) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      ...listResult,
      summary,
    });
  } catch (error) {
    console.error('[admin/bookings/list]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
