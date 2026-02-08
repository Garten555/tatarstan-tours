import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['super_admin', 'tour_admin', 'support_admin'];

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const { data: setting } = await serviceClient
      .from('site_settings')
      .select('value_json')
      .eq('key', 'maintenance_mode')
      .single();

    const enabled = Boolean((setting as any)?.value_json?.enabled);
    const message = (setting as any)?.value_json?.message || '';

    return NextResponse.json({ success: true, enabled, message });
  } catch (error) {
    console.error('Ошибка получения режима обслуживания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const enabled = Boolean(body?.enabled);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    const { error } = await (serviceClient as any)
      .from('site_settings')
      .upsert({
        key: 'maintenance_mode',
        value_json: { enabled, message },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Ошибка обновления режима обслуживания:', error);
      return NextResponse.json(
        { error: 'Не удалось обновить режим обслуживания' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, enabled, message });
  } catch (error) {
    console.error('Ошибка обновления режима обслуживания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}




