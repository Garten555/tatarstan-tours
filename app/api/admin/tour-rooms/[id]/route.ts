import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// DELETE /api/admin/tour-rooms/[id] - удаление комнаты тура
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

    if (
      typedProfile?.role !== 'tour_admin' &&
      typedProfile?.role !== 'super_admin' &&
      typedProfile?.role !== 'support_admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Проверяем существование комнаты
    const { data: room, error: roomError } = await serviceClient
      .from('tour_rooms')
      .select('id, tour_id')
      .eq('id', id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Комната не найдена' },
        { status: 404 }
      );
    }

    // Удаляем комнату (CASCADE удалит все связанные данные: участников, сообщения, медиа)
    const { error: deleteError } = await serviceClient
      .from('tour_rooms')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Ошибка удаления комнаты:', deleteError);
      return NextResponse.json(
        { error: 'Не удалось удалить комнату' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Комната успешно удалена',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tour-rooms/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


