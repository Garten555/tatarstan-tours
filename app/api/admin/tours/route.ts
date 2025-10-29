import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/admin/tours - создание тура
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Проверяем права (tour_admin или super_admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'tour_admin' && profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tour_admin or super_admin can create tours' },
        { status: 403 }
      );
    }

    // Получаем данные из запроса
    const tourData = await request.json();

    // Добавляем created_by
    tourData.created_by = user.id;

    // Создаём тур через service_role
    const { data, error } = await serviceClient
      .from('tours')
      .insert(tourData)
      .select()
      .single();

    if (error) {
      console.error('Error creating tour:', error);
      return NextResponse.json(
        { error: 'Failed to create tour', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/admin/tours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

