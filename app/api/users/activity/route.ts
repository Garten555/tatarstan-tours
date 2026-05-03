import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mergeLatestActivityTimestamps } from '@/lib/utils/presence';

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.user_ids)
      ? body.user_ids.filter((id: unknown) => typeof id === 'string' && id.length > 0)
      : [];

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, activityByUserId: {} });
    }

    const uniqueUserIds = Array.from(new Set(userIds)).slice(0, 200);

    const [{ data: directMessages }, { data: roomMessages }] = await Promise.all([
      serviceClient
        .from('user_messages')
        .select('sender_id, created_at')
        .in('sender_id', uniqueUserIds)
        .order('created_at', { ascending: false })
        .limit(1500),
      serviceClient
        .from('tour_room_messages')
        .select('user_id, created_at')
        .in('user_id', uniqueUserIds)
        .order('created_at', { ascending: false })
        .limit(1500),
    ]);

    const activityMap = new Map<string, string>();
    for (const row of directMessages || []) {
      const id = (row as any).sender_id as string;
      const ts = (row as any).created_at as string;
      if (!activityMap.has(id)) activityMap.set(id, ts);
    }
    for (const row of roomMessages || []) {
      const id = (row as any).user_id as string;
      const ts = (row as any).created_at as string;
      const prev = activityMap.get(id);
      if (!prev || new Date(ts).getTime() > new Date(prev).getTime()) {
        activityMap.set(id, ts);
      }
    }

    const { data: profileSeen } = await serviceClient
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', uniqueUserIds);

    for (const row of profileSeen || []) {
      const id = (row as { id: string }).id;
      const ls = (row as { last_seen_at: string | null }).last_seen_at;
      const msgTs = activityMap.get(id) || null;
      const merged = mergeLatestActivityTimestamps(ls, msgTs);
      if (merged) activityMap.set(id, merged);
    }

    const activityByUserId: Record<string, string | null> = {};
    for (const id of uniqueUserIds) {
      activityByUserId[id] = activityMap.get(id) || null;
    }

    return NextResponse.json({ success: true, activityByUserId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
