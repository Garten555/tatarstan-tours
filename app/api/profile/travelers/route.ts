import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

    const { data: travelers, error } = await serviceClient
      .from('user_travelers')
      .select('id, full_name, relationship, is_child, email, phone, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки участников:', error);
      return NextResponse.json(
        { error: 'Не удалось получить участников' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, travelers: travelers || [] });
  } catch (error) {
    console.error('Ошибка получения участников:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { full_name, relationship, is_child, email, phone } = body || {};

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Укажите ФИО участника' },
        { status: 400 }
      );
    }

    const { data: traveler, error } = await serviceClient
      .from('user_travelers')
      .insert({
        user_id: user.id,
        full_name: full_name.trim(),
        relationship: relationship || null,
        is_child: !!is_child,
        email: email || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения участника:', error);
      return NextResponse.json(
        { error: 'Не удалось сохранить участника' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, traveler });
  } catch (error) {
    console.error('Ошибка создания участника:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

















