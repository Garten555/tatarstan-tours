import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { id } = await params;

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

    const body = await request.json();
    const { full_name, relationship, is_child, email, phone } = body || {};

    const { data: traveler, error } = await serviceClient
      .from('user_travelers')
      .update({
        ...(full_name !== undefined && { full_name: full_name?.trim() }),
        ...(relationship !== undefined && { relationship: relationship || null }),
        ...(is_child !== undefined && { is_child: !!is_child }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !traveler) {
      console.error('Ошибка обновления участника:', error);
      return NextResponse.json(
        { error: 'Не удалось обновить участника' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, traveler });
  } catch (error) {
    console.error('Ошибка обновления участника:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { id } = await params;

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

    const { error } = await serviceClient
      .from('user_travelers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Ошибка удаления участника:', error);
      return NextResponse.json(
        { error: 'Не удалось удалить участника' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления участника:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
















