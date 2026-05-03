import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** Не чаще одного раза за интервал — меньше записей в БД при переключении вкладок */
const MIN_INTERVAL_MS = 90_000;

export async function POST() {
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

    const { data: row, error: selErr } = await serviceClient
      .from('profiles')
      .select('last_seen_at')
      .eq('id', user.id)
      .maybeSingle();

    if (selErr) {
      console.error('[presence]', selErr);
      return NextResponse.json({ error: 'Не удалось проверить профиль' }, { status: 500 });
    }

    const last = row?.last_seen_at ? new Date(row.last_seen_at as string).getTime() : 0;
    if (last && Date.now() - last < MIN_INTERVAL_MS) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const now = new Date().toISOString();
    const { error: upErr } = await serviceClient
      .from('profiles')
      .update({ last_seen_at: now })
      .eq('id', user.id);

    if (upErr) {
      console.error('[presence] update', upErr);
      return NextResponse.json({ error: 'Не удалось обновить присутствие' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, last_seen_at: now });
  } catch (e: unknown) {
    console.error('[presence]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
