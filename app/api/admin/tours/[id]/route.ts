import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { deleteFileFromS3 } from '@/lib/s3/upload';

// PUT /api/admin/tours/[id] - обновление тура
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Проверяем права
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Получаем данные
    const tourData = await request.json();

    // Обновляем тур
    const { data, error } = await (serviceClient as any)
      .from('tours')
      .update(tourData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tour:', error);
      return NextResponse.json(
        { error: 'Failed to update tour' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/admin/tours/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tours/[id] - удаление тура (+ S3)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Проверяем права
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Получаем информацию о туре и его медиа
    const { data: tour, error: tourError } = await serviceClient
      .from('tours')
      .select('cover_path')
      .eq('id', id)
      .single();

    if (tourError || !tour) {
      console.error('Error fetching tour:', tourError);
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    const { data: media } = await serviceClient
      .from('tour_media')
      .select('media_path')
      .eq('tour_id', id);

    // Проверяем наличие бронирований и удаляем их все (админ может удалять любые туры)
    const { data: bookings, error: bookingsError } = await serviceClient
      .from('bookings')
      .select('id, status')
      .eq('tour_id', id);

    const bookingsCount = bookings?.length || 0;

    // Удаляем все бронирования (независимо от статуса - админ имеет право удалять любые туры)
    if (bookingsCount > 0) {
      const { error: deleteBookingsError } = await serviceClient
        .from('bookings')
        .delete()
        .eq('tour_id', id);

      if (deleteBookingsError) {
        console.error('Error deleting bookings:', deleteBookingsError);
        return NextResponse.json(
          { error: 'Failed to delete related bookings' },
          { status: 500 }
        );
      }
    }

    // Удаляем тур из БД (CASCADE удалит связанные медиа)
    const { error: deleteError } = await serviceClient
      .from('tours')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting tour:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete tour' },
        { status: 500 }
      );
    }

    // Удаляем файлы из S3
    const filesToDelete = [];

    if ((tour as any)?.cover_path) {
      filesToDelete.push((tour as any).cover_path);
    }

    if (media) {
      media.forEach((m: any) => {
        if (m.media_path) {
          filesToDelete.push(m.media_path);
        }
      });
    }

    // Удаляем файлы из S3 (асинхронно, не блокируем ответ)
    if (filesToDelete.length > 0) {
      Promise.all(
        filesToDelete.map(path => deleteFileFromS3(path))
      ).catch(err => console.error('Error deleting files from S3:', err));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tour deleted successfully',
      deletedFiles: filesToDelete.length 
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tours/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

