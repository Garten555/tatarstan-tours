import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { canLeaveReviewForBooking } from '@/lib/bookings/review-eligibility';
import { shouldAutoPublishReview } from '@/lib/reviews/staff-auto-publish';

type ReviewMediaInput = {
  media_type: 'image' | 'video';
  media_url: string;
  media_path?: string | null;
  order_index?: number | null;
};

type TourRelation = {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type TourSessionRelation = {
  start_at?: string | null;
  end_at?: string | null;
};

/** Supabase join может вернуть объект или массив из одного элемента. */
function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
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
    const bookingId = body?.booking_id as string | undefined;
    const tourId = body?.tour_id as string | undefined;
    const rating = Number(body?.rating);
    const text = typeof body?.text === 'string' ? body.text.trim() : null;
    const mediaItems = Array.isArray(body?.media) ? (body.media as ReviewMediaInput[]) : [];

    if (!bookingId || !tourId || Number.isNaN(rating)) {
      return NextResponse.json(
        { error: 'Не все поля заполнены' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Рейтинг должен быть от 1 до 5' },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await serviceClient
      .from('bookings')
      .select(`
        id, user_id, tour_id, status, session_id,
        tour:tours(id, status, start_date, end_date),
        tour_session:tour_sessions(start_at, end_at)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Бронирование не найдено' },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    if (booking.tour_id !== tourId) {
      return NextResponse.json(
        { error: 'Некорректный тур' },
        { status: 400 }
      );
    }

    const bookingRow = booking as {
      status: string;
      session_id?: string | null;
      tour?: TourRelation | TourRelation[] | null;
      tour_session?: TourSessionRelation | TourSessionRelation[] | null;
    };
    const tour = unwrapRelation(bookingRow.tour);
    const tourSession = unwrapRelation(bookingRow.tour_session);

    if (
      !canLeaveReviewForBooking({
        status: booking.status,
        session_id: bookingRow.session_id,
        tour_session: tourSession,
        tour,
      })
    ) {
      return NextResponse.json(
        { error: 'Отзыв можно оставить только после завершения тура' },
        { status: 400 }
      );
    }

    const { data: existingReview } = await serviceClient
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingReview?.id) {
      return NextResponse.json(
        { error: 'Отзыв уже существует' },
        { status: 409 }
      );
    }

    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const autoPublish = shouldAutoPublishReview(
      (authorProfile as { role?: string | null } | null)?.role
    );

    const { data: review, error: reviewError } = await serviceClient
      .from('reviews')
      .insert({
        user_id: user.id,
        tour_id: tourId,
        booking_id: bookingId,
        rating,
        text,
        is_approved: autoPublish,
        is_published: autoPublish,
      })
      .select()
      .single();

    if (reviewError || !review) {
      console.error('Ошибка создания отзыва:', reviewError);
      return NextResponse.json(
        { error: 'Не удалось сохранить отзыв' },
        { status: 500 }
      );
    }

    if (mediaItems.length > 0) {
      const sanitizedMedia = mediaItems
        .filter((item) => item?.media_url && item?.media_type)
        .map((item, index) => ({
          review_id: review.id,
          media_type: item.media_type,
          media_url: item.media_url,
          media_path: item.media_path || null,
          order_index: item.order_index ?? index,
        }));

      if (sanitizedMedia.length > 0) {
        const { error: mediaError } = await serviceClient
          .from('review_media')
          .insert(sanitizedMedia);

        if (mediaError) {
          console.error('Ошибка сохранения медиа отзыва:', mediaError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      review,
      auto_published: autoPublish,
    });
  } catch (error) {
    console.error('Ошибка API отзывов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


























