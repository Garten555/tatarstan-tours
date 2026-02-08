// API для ручного завершения всех завершенных туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, является ли пользователь админом
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
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Вызываем функцию для завершения туров
    const { data, error } = await serviceClient.rpc('auto_complete_finished_tours');

    if (error) {
      console.error('Ошибка завершения туров:', error);
      return NextResponse.json(
        { error: 'Не удалось завершить туры' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completed_count: data || 0,
      message: `Завершено туров: ${data || 0}`,
    });
  } catch (error: any) {
    console.error('Ошибка завершения туров:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}










