// API для проверки и автозавершения туров с прошедшими датами
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeFinishedActiveTours } from '@/lib/tours/tour-lifecycle-status';

async function assertAdmin(serviceClient: ReturnType<typeof createServiceClient>, userId: string) {
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isAdmin =
    profile?.role === 'tour_admin' ||
    profile?.role === 'super_admin' ||
    profile?.role === 'support_admin';

  return isAdmin;
}

export async function GET(request: NextRequest) {
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

    if (!(await assertAdmin(serviceClient, user.id))) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const result = await completeFinishedActiveTours(serviceClient);

    return NextResponse.json({
      success: true,
      found: result.completed_count,
      updated: result.completed_count,
      tour_ids: result.tour_ids,
      message:
        result.completed_count > 0
          ? `Завершено туров: ${result.completed_count}`
          : 'Нет туров для завершения',
    });
  } catch (error) {
    console.error('Ошибка проверки статусов туров:', error);
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
