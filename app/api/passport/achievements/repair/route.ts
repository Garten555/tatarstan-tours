import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { syncAllUserAchievements } from '@/lib/achievements/auto-award';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

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

    const result = await syncAllUserAchievements(serviceClient, user.id);

    return NextResponse.json({
      success: true,
      awarded: result.awarded,
      reputation_score: result.reputation_score,
      status_level: result.status_level,
    });
  } catch (error) {
    console.error('Ошибка обновления достижений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
