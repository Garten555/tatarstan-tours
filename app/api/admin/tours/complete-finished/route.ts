// API для ручного завершения всех туров с прошедшими датами
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeFinishedActiveTours } from '@/lib/tours/tour-lifecycle-status';

export async function POST(request: NextRequest) {
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

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const result = await completeFinishedActiveTours(serviceClient);

    return NextResponse.json({
      success: true,
      completed_count: result.completed_count,
      tour_ids: result.tour_ids,
      message: `Завершено туров: ${result.completed_count}`,
    });
  } catch (error) {
    console.error('Ошибка завершения туров:', error);
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
