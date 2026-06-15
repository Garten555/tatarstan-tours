import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getGuideDashboardData } from '@/lib/admin/guide-dashboard-data';

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (role !== 'guide') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const data = await getGuideDashboardData(serviceClient, user.id);

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[guide/dashboard]', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
