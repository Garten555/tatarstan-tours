import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// PUT /api/admin/users/role - изменить роль пользователя
export async function PUT(request: NextRequest) {
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

    // Проверяем что пользователь - super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can change roles' },
        { status: 403 }
      );
    }

    // Получаем данные из запроса
    const { userId, newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'userId and newRole are required' },
        { status: 400 }
      );
    }

    // Валидация роли
    const validRoles = ['user', 'guide', 'tour_admin', 'support_admin', 'super_admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Запрещаем изменять свою собственную роль
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Обновляем роль через service_role (обходим RLS)
    const { data, error } = await (serviceClient as any)
      .from('profiles')
      .update({ role: newRole } as any)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

