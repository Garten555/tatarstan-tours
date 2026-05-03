import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** Роль из profiles без обхода RLS-сбоев anon-клиента (как в /api/upload). */
async function getTourStaffRole(userId: string, cookieSupabase: SupabaseClient): Promise<string | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createServiceClient()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    const r = (data as { role?: string } | null)?.role;
    return r?.trim() ?? null;
  }
  const { data } = await cookieSupabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  const r = (data as { role?: string } | null)?.role;
  return r?.trim() ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Проверка авторизации
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

    const role = await getTourStaffRole(user.id, supabase);
    if (!role || (role !== 'tour_admin' && role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tour_id, media_type, media_url, order_index } = body;

    if (!tour_id || !media_type || !media_url) {
      return NextResponse.json(
        { error: 'Необходимы tour_id, media_type и media_url' },
        { status: 400 }
      );
    }

    const { data: existingSameUrl } = await serviceClient
      .from('tour_media')
      .select('id')
      .eq('tour_id', tour_id)
      .eq('media_url', media_url)
      .maybeSingle();

    if (existingSameUrl) {
      return NextResponse.json({
        success: true,
        data: existingSameUrl,
        alreadyExists: true,
      });
    }

    // Получаем текущий максимальный order_index если не указан
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingMedia } = await serviceClient
        .from('tour_media')
        .select('order_index')
        .eq('tour_id', tour_id)
        .order('order_index', { ascending: false })
        .limit(1);
      
      interface MediaItem {
        order_index: number;
      }
      finalOrderIndex = existingMedia && existingMedia.length > 0 
        ? ((existingMedia[0] as MediaItem).order_index + 1)
        : 0;
    }

    // Сохраняем в БД
    const { data: mediaData, error: mediaError } = await serviceClient
      .from('tour_media')
      .insert({
        tour_id,
        media_type: media_type === 'photo' ? 'image' : media_type,
        media_url,
        order_index: finalOrderIndex,
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Ошибка сохранения медиа в БД:', mediaError);
      return NextResponse.json(
        { error: 'Не удалось сохранить медиа', details: mediaError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mediaData,
    });
  } catch (error) {
    console.error('Ошибка сохранения медиа:', error);
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const role = await getTourStaffRole(user.id, supabase);
    if (!role || (role !== 'tour_admin' && role !== 'super_admin')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const { tour_id, media_url } = body as { tour_id?: string; media_url?: string };

    if (!tour_id || !media_url) {
      return NextResponse.json({ error: 'Необходимы tour_id и media_url' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('tour_media')
      .delete()
      .eq('tour_id', tour_id)
      .eq('media_url', media_url);

    if (error) {
      console.error('Ошибка удаления медиа тура:', error);
      return NextResponse.json({ error: 'Не удалось удалить медиа', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления медиа тура:', error);
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', details: errorMessage }, { status: 500 });
  }
}

