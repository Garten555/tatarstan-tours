import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export async function POST(_request: NextRequest) {
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

    const { data: bookings, error: bookingsError } = await serviceClient
      .from('bookings')
      .select('tour_id')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (bookingsError) {
      console.error('Ошибка загрузки завершенных туров:', bookingsError);
      return NextResponse.json(
        { error: 'Не удалось получить завершенные туры' },
        { status: 500 }
      );
    }

    const uniqueTourIds = Array.from(
      new Set((bookings || []).map((b: any) => b.tour_id).filter(Boolean))
    );

    if (uniqueTourIds.length === 0) {
      return NextResponse.json({ success: true, awarded: 0 });
    }

    let awardedTotal = 0;

    for (const tourId of uniqueTourIds) {
      const { data: awarded, error: awardError } = await serviceClient.rpc(
        'award_tour_achievements',
        {
          p_user_id: user.id,
          p_tour_id: tourId,
        }
      );

      if (awardError) {
        if (awardError.code !== '42P10') {
          console.error('Ошибка выдачи достижений:', awardError);
          return NextResponse.json(
            { error: 'Не удалось выдать достижения' },
            { status: 500 }
          );
        }
        break;
      }

      if (typeof awarded === 'number') {
        awardedTotal += awarded;
      }
    }

    if (awardedTotal > 0) {
      return NextResponse.json({ success: true, awarded: awardedTotal });
    }

    // Fallback: ручная выдача без использования ON CONFLICT
    const { data: tours, error: toursError } = await serviceClient
      .from('tours')
      .select('id, category')
      .in('id', uniqueTourIds);

    if (toursError) {
      console.error('Ошибка загрузки туров:', toursError);
      return NextResponse.json(
        { error: 'Не удалось получить данные туров' },
        { status: 500 }
      );
    }

    const { count: completedCount, error: completedError } = await serviceClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (completedError) {
      console.error('Ошибка подсчета туров:', completedError);
      return NextResponse.json(
        { error: 'Не удалось подсчитать туры' },
        { status: 500 }
      );
    }

    const categoryBadges: Record<
      string,
      { badge_type: string; badge_name: string; badge_description: string }
    > = {
      history: { badge_type: 'history', badge_name: 'Историк', badge_description: 'Посетил исторический тур' },
      nature: { badge_type: 'nature', badge_name: 'Натуралист', badge_description: 'Посетил тур по природе' },
      culture: { badge_type: 'culture', badge_name: 'Культуролог', badge_description: 'Посетил культурный тур' },
      architecture: { badge_type: 'architecture', badge_name: 'Архитектор', badge_description: 'Посетил архитектурный тур' },
      food: { badge_type: 'gastronomy', badge_name: 'Гастроном', badge_description: 'Посетил гастрономический тур' },
      adventure: { badge_type: 'adventure', badge_name: 'Авантюрист', badge_description: 'Посетил приключенческий тур' },
    };

    const ensureAchievement = async (
      badge: { badge_type: string; badge_name: string; badge_description: string },
      tourId: string,
      verificationData?: Record<string, any>
    ) => {
      const { data: existing } = await serviceClient
        .from('achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_type', badge.badge_type)
        .maybeSingle();

      if (existing) return 0;

      const { data: newAchievement, error: insertError } = await serviceClient
        .from('achievements')
        .insert({
          user_id: user.id,
          badge_type: badge.badge_type,
          badge_name: badge.badge_name,
          badge_description: badge.badge_description,
          tour_id: tourId,
          verification_data: verificationData || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Ошибка создания достижения:', insertError);
        return 0;
      }

      // Отправляем уведомление через Pusher
      if (pusher && newAchievement) {
        try {
          await pusher.trigger(
            `notifications-${user.id}`,
            'new-notification',
            {
              notification: {
                id: newAchievement.id,
                title: newAchievement.badge_name || 'Новое достижение',
                body: newAchievement.badge_description || null,
                type: 'achievement',
                created_at: newAchievement.unlock_date || new Date().toISOString(),
              },
            }
          );
        } catch (pusherError) {
          console.error('Ошибка отправки уведомления через Pusher:', pusherError);
          // Не прерываем выполнение, достижение уже создано
        }
      }

      return 1;
    };

    for (const tour of tours || []) {
      const badge = categoryBadges[(tour as any).category || ''];
      if (badge) {
        awardedTotal += await ensureAchievement(badge, (tour as any).id);
      }
    }

    if (completedCount === 1 && uniqueTourIds[0]) {
      awardedTotal += await ensureAchievement(
        { badge_type: 'first_tour', badge_name: 'Первый шаг', badge_description: 'Завершил свой первый тур' },
        uniqueTourIds[0]
      );
    }

    const milestones = [10, 25, 50, 100];
    const milestoneLabels: Record<number, { badge_type: string; badge_name: string; badge_description: string }> = {
      10: { badge_type: '10_tours', badge_name: 'Исследователь', badge_description: 'Завершил 10 туров' },
      25: { badge_type: '25_tours', badge_name: 'Путешественник', badge_description: 'Завершил 25 туров' },
      50: { badge_type: '50_tours', badge_name: 'Мастер путешествий', badge_description: 'Завершил 50 туров' },
      100: { badge_type: '100_tours', badge_name: 'Легенда путешествий', badge_description: 'Завершил 100 туров' },
    };

    if (milestones.includes(completedCount || 0) && uniqueTourIds[0]) {
      const badge = milestoneLabels[completedCount as number];
      awardedTotal += await ensureAchievement(
        badge,
        uniqueTourIds[0],
        { tours_count: completedCount }
      );
    }

    return NextResponse.json({ success: true, awarded: awardedTotal });
  } catch (error) {
    console.error('Ошибка обновления достижений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

