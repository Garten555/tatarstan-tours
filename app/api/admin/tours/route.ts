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
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tour_admin or super_admin can create tours' },
        { status: 403 }
      );
    }

    // Получаем данные из запроса
    const tourData = await request.json();
    
    console.log('📝 Received tour data:', JSON.stringify(tourData, null, 2));

    // Добавляем created_by
    tourData.created_by = user.id;
    
    console.log('👤 Added created_by:', user.id);
    console.log('✅ Final tour data to insert:', JSON.stringify(tourData, null, 2));

    // Создаём тур через service_role
    interface TourInsertData {
      [key: string]: unknown;
    }
    interface CreatedTour {
      id: string;
      [key: string]: unknown;
    }
    const { data, error } = await serviceClient
      .from('tours')
      .insert(tourData as TourInsertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating tour:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to create tour', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Tour created successfully:', (data as CreatedTour)?.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/admin/tours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Обновление тура
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверка прав
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (!typedProfile || !['super_admin', 'tour_admin'].includes(typedProfile.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tourData = await request.json();
    
            if (process.env.NODE_ENV !== 'production') {
              console.log('📝 Updating tour:', tourData.id);
            }

    // Удаляем поля, которые не нужно обновлять
    interface TourData {
      id?: string;
      created_at?: string;
      created_by?: string;
      gallery_photos?: unknown;
      video_urls?: unknown;
      [key: string]: unknown;
    }
    const { id, created_at, created_by, gallery_photos, video_urls, ...updateData } = tourData as TourData;

    if (!id) {
      return NextResponse.json({ error: 'Tour ID required' }, { status: 400 });
    }

            if (process.env.NODE_ENV !== 'production') {
              console.log('✅ Data to update:', JSON.stringify(updateData, null, 2));
            }

    interface TourUpdateData {
      [key: string]: unknown;
    }
    const { data, error } = await serviceClient
      .from('tours')
      .update(updateData as TourUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating tour:', error);
      return NextResponse.json(
        { error: 'Failed to update tour', details: error.message },
        { status: 500 }
      );
    }

            if (process.env.NODE_ENV !== 'production') {
              console.log('✅ Tour updated successfully:', data.id);
            }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/admin/tours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

