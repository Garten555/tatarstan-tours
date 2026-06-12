import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import { normalizeTourTimestampForStorage } from '@/lib/date/tour-timestamp';
import { DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG } from '@/lib/tour/auto-schedule-config';

function normalizeTourDateFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if ('start_date' in out && out.start_date != null) {
    out.start_date = normalizeTourTimestampForStorage(String(out.start_date));
  }
  if ('end_date' in out && out.end_date != null) {
    out.end_date = normalizeTourTimestampForStorage(String(out.end_date));
  }
  return out;
}

/** В БД end_date NOT NULL — подставляем длительность из шаблона авторасписания. */
function ensureTourEndDate(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if (out.end_date != null && out.end_date !== '') return out;
  const startRaw = out.start_date;
  if (!startRaw) return out;
  const start = new Date(String(startRaw));
  if (Number.isNaN(start.getTime())) return out;
  const end = new Date(
    start.getTime() + DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG.duration_minutes * 60_000
  );
  out.end_date = normalizeTourTimestampForStorage(end.toISOString());
  return out;
}

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
    const tourData = ensureTourEndDate(
      normalizeTourDateFields((await request.json()) as Record<string, unknown>)
    );
    
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

    void publishCatalogChanged();

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

    const tourData = ensureTourEndDate(
      normalizeTourDateFields((await request.json()) as Record<string, unknown>)
    );

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
    void publishCatalogChanged();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/admin/tours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

