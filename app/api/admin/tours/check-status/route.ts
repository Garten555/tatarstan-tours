// API для проверки и исправления статусов туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Проверяем туры, которые должны быть завершены
    const now = new Date().toISOString();
    const { data: toursToComplete, error: checkError } = await serviceClient
      .from('tours')
      .select('id, title, end_date, status')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lt('end_date', now);

    if (checkError) {
      console.error('Ошибка проверки туров:', checkError);
      return NextResponse.json(
        { error: 'Не удалось проверить туры' },
        { status: 500 }
      );
    }

    // Обновляем статусы
    if (toursToComplete && toursToComplete.length > 0) {
      const tourIds = toursToComplete.map((t: any) => t.id);
      
      // Используем RPC для обновления статуса (так как это ENUM)
      const { data: updated, error: updateError } = await serviceClient
        .from('tours')
        .update({ status: 'completed' as any })
        .in('id', tourIds)
        .select('id, title, status');

      if (updateError) {
        console.error('Ошибка обновления туров:', updateError);
        return NextResponse.json(
          { error: 'Не удалось обновить туры' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        found: toursToComplete.length,
        updated: updated?.length || 0,
        tours: toursToComplete,
        updated_tours: updated,
      });
    }

    return NextResponse.json({
      success: true,
      found: 0,
      updated: 0,
      message: 'Нет туров для завершения',
    });
  } catch (error: any) {
    console.error('Ошибка проверки статусов туров:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST - принудительное обновление статусов
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
    const { data: functionResult, error: functionError } = await serviceClient.rpc('auto_complete_finished_tours');

    if (functionError) {
      console.error('Ошибка функции завершения туров:', functionError);
      
      // Если функция не работает, делаем прямое обновление
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await serviceClient
        .from('tours')
        .update({ status: 'completed' as any })
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .lt('end_date', now)
        .select('id, title, status');

      if (updateError) {
        return NextResponse.json(
          { error: 'Не удалось завершить туры', details: updateError },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'direct_update',
        completed_count: updated?.length || 0,
        tours: updated,
      });
    }

    return NextResponse.json({
      success: true,
      method: 'function',
      completed_count: functionResult || 0,
    });
  } catch (error: any) {
    console.error('Ошибка завершения туров:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

