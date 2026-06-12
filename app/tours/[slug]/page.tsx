export const revalidate = 60
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import TourHeaderCard from '@/components/tours/TourHeaderCard';
import TourScheduleBooking from '@/components/tours/TourScheduleBooking';
import { TourSessionsProvider } from '@/components/tours/TourSessionsProvider';
import TourDescriptionSection from '@/components/tours/TourDescriptionSection';
import TourCharacteristicsSectionConnected from '@/components/tours/TourCharacteristicsSectionConnected';
import { tourDurationLabel } from '@/lib/tour/session-display';
import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';
import TourMediaGallery from '@/components/tours/TourMediaGallery';
import TourVideoSection from '@/components/tours/TourVideoSection';
import TourMapSection from '@/components/tours/TourMapSection';
import TourReviewsSection from '@/components/tours/TourReviewsSection';
import { ArrowLeft } from 'lucide-react';
import { isInvalidTourSlug } from '@/lib/tours/isInvalidTourSlug';
import TourBookingRedirectBanner from '@/components/tours/TourBookingRedirectBanner';
import TourBookingSidebarCard from '@/components/tours/TourBookingSidebarCard';
import { parseBookingTourRedirectError } from '@/lib/tour/booking-tour-redirect';
import {
  filterUpcomingSessions,
  isTourVisibleInPublicCatalog,
} from '@/lib/tours/tour-public-visibility';
import { syncSessionCurrentParticipants } from '@/lib/tour/session-participants';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import { isBookingDeparturePast } from '@/lib/bookings/booking-completion';

interface TourPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string | string[];
    booking?: string | string[];
    session?: string | string[];
  }>;
}

type BookingSidebarView = {
  startDate: string | null;
  endDate: string | null;
  variant: 'participant' | 'staff';
  mode: 'archive' | 'upcoming';
};

export default async function TourPage({ params, searchParams }: TourPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const bookingRedirectError = parseBookingTourRedirectError(sp.error);
  if (isInvalidTourSlug(slug)) {
    notFound();
  }
  const supabase = await createServiceClient();
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  // Получаем данные тура (в т.ч. завершённого — для участников с бронью)
  const { data: tour, error } = await supabase
    .from('tours')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !tour) {
    notFound();
  }

  const t = tour as any;

  const bookingIdRaw = sp.booking;
  const bookingId = typeof bookingIdRaw === 'string' ? bookingIdRaw : undefined;
  const sessionIdRaw = sp.session;
  const initialSessionId =
    typeof sessionIdRaw === 'string' && sessionIdRaw.length > 0
      ? sessionIdRaw
      : undefined;
  let bookingSidebarView: BookingSidebarView | null = null;

  let viewerRole: string | null = null;
  if (user) {
    const { data: viewerProfile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    viewerRole = (viewerProfile as { role?: string | null } | null)?.role ?? null;
  }
  const isStaffViewer =
    viewerRole === 'tour_admin' ||
    viewerRole === 'super_admin' ||
    viewerRole === 'support_admin';

  if (bookingId) {
    if (!user) {
      notFound();
    }

    const { data: bookingRow, error: bookingLoadError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        user_id,
        tour_id,
        status,
        departure_start_at,
        departure_end_at,
        schedule_superseded_at,
        tour_session:tour_sessions(start_at, end_at),
        tour:tours!bookings_tour_id_fkey(id, slug, start_date, end_date, status)
      `
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingLoadError || !bookingRow) {
      notFound();
    }

    const tourSession = Array.isArray(bookingRow.tour_session)
      ? bookingRow.tour_session[0] ?? null
      : bookingRow.tour_session ?? null;
    const bookingTour = Array.isArray(bookingRow.tour)
      ? bookingRow.tour[0] ?? null
      : bookingRow.tour ?? null;

    let canViewBooking = bookingRow.user_id === user.id;
    if (!canViewBooking) {
      canViewBooking =
        viewerRole === 'tour_admin' || viewerRole === 'super_admin';
    }

    if (!canViewBooking) {
      notFound();
    }

    if (bookingTour?.slug && bookingTour.slug !== slug) {
      redirect(`/tours/${bookingTour.slug}?booking=${bookingId}`);
    }

    if (bookingRow.tour_id !== t.id) {
      notFound();
    }

    const departurePast =
      isBookingDeparturePast({
        status: bookingRow.status,
        departure_start_at: bookingRow.departure_start_at,
        departure_end_at: bookingRow.departure_end_at,
        schedule_superseded_at: bookingRow.schedule_superseded_at,
        tour_session: tourSession,
        tour: bookingTour,
      });

    bookingSidebarView = {
      startDate:
        bookingRow.departure_start_at ??
        tourSession?.start_at ??
        bookingTour?.start_date ??
        t.start_date ??
        null,
      endDate:
        bookingRow.departure_end_at ??
        tourSession?.end_at ??
        bookingTour?.end_date ??
        t.end_date ??
        null,
      variant: bookingRow.user_id === user.id ? 'participant' : 'staff',
      mode: departurePast ? 'archive' : 'upcoming',
    };
  }

  // Получаем медиа галерею
  const { data: media, error: mediaError } = await supabase
    .from('tour_media')
    .select('*')
    .eq('tour_id', t.id)
    .order('created_at', { ascending: true });

  if (mediaError) console.error('❌ Ошибка загрузки медиа:', mediaError);

  // В БД media_type: 'image' | 'video' — совместимость со старым 'photo'
  const mediaTyped = ((media || []) as any[]);
  const photos = mediaTyped.filter((m) => m.media_type === 'image' || m.media_type === 'photo');
  const videosRaw = mediaTyped.filter((m) => m.media_type === 'video');
  /** Убираем дубликаты по URL (раньше загрузка + сохранение формы создавали двойные строки) */
  const seenVideoUrls = new Set<string>();
  const videos = videosRaw.filter((v: { media_url?: string }) => {
    const u = v.media_url;
    if (!u || seenVideoUrls.has(u)) return false;
    seenVideoUrls.add(u);
    return true;
  });

  const tourSessionsRes = await supabase
    .from('tour_sessions')
    .select('id, start_at, end_at, max_participants, current_participants')
    .eq('tour_id', t.id)
    .eq('status', 'active')
    .order('start_at', { ascending: true });

  if (tourSessionsRes.error) {
    console.error('[tour page] tour_sessions:', tourSessionsRes.error.message);
  }

  let tourSessions = ((!tourSessionsRes.error && tourSessionsRes.data)
    ? tourSessionsRes.data
    : []) as {
    id: string;
    start_at: string;
    end_at: string | null;
    max_participants: number;
    current_participants: number | null;
  }[];

  if (tourSessions.length > 0) {
    await Promise.all(
      tourSessions.map((s) => syncSessionCurrentParticipants(supabase, s.id))
    );
    const refreshed = await supabase
      .from('tour_sessions')
      .select('id, start_at, end_at, max_participants, current_participants')
      .eq('tour_id', t.id)
      .eq('status', 'active')
      .order('start_at', { ascending: true });
    if (!refreshed.error && refreshed.data) {
      tourSessions = refreshed.data as typeof tourSessions;
    }
  }

  /** Нет слотов в БД — показываем дату/места из строки тура и бронь без session_id (как раньше). */
  if (tourSessions.length === 0 && t.start_date) {
    const { count: sessionRowsCount, error: cntErr } = await supabase
      .from('tour_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', t.id);

    const hasAnySessionRows = !cntErr && (sessionRowsCount ?? 0) > 0;

    if (!hasAnySessionRows) {
      tourSessions = [
        {
          id: LEGACY_TOUR_SESSION_ID,
          start_at: t.start_date,
          end_at: t.end_date ?? null,
          max_participants: t.max_participants,
          current_participants: t.current_participants ?? 0,
        },
      ];
    }
  }

  let participantArchiveMode = false;
  const catalogVisible = isTourVisibleInPublicCatalog(
    { start_date: t.start_date, end_date: t.end_date },
    tourSessions
  );

  if (!catalogVisible) {
    if (!user) {
      notFound();
    }

    if (!isStaffViewer) {
      const { count: participantBookingCount, error: participantError } =
        await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('tour_id', t.id)
          .in('status', ['confirmed', 'completed']);

      if (participantError || !participantBookingCount) {
        notFound();
      }

      participantArchiveMode = true;
    }
  }

  if (!participantArchiveMode) {
    const sessionsBeforeFilter = tourSessions;
    tourSessions = filterUpcomingSessions(tourSessions);

    if (
      initialSessionId &&
      !tourSessions.some((s) => s.id === initialSessionId)
    ) {
      const pinned = sessionsBeforeFilter.find((s) => s.id === initialSessionId);
      if (pinned) {
        tourSessions = [pinned, ...tourSessions];
      }
    }

    if (tourSessions.length === 0 && t.start_date) {
      const start = new Date(t.start_date);
      if (start > new Date()) {
        tourSessions = [
          {
            id: LEGACY_TOUR_SESSION_ID,
            start_at: t.start_date,
            end_at: t.end_date ?? null,
            max_participants: t.max_participants,
            current_participants: t.current_participants ?? 0,
          },
        ];
      }
    }
  }

  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('id, rating, text, created_at, user_id')
    .eq('tour_id', t.id)
    .eq('is_published', true)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  const reviewItemsRaw = (reviewsData as any[]) || [];
  const reviewUserIds = reviewItemsRaw.map((review) => review.user_id);
  const reviewIds = reviewItemsRaw.map((review) => review.id);

  const { data: reviewProfiles } =
    reviewUserIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, role')
          .in('id', reviewUserIds)
      : { data: [] };

  const { data: reviewMedia } =
    reviewIds.length > 0
      ? await supabase
          .from('review_media')
          .select('review_id, media_type, media_url')
          .in('review_id', reviewIds)
          .order('order_index', { ascending: true })
      : { data: [] };

  const { data: reviewComments } =
    reviewIds.length > 0
      ? await supabase
          .from('review_comments')
          .select('id, review_id, message, created_at, user_id')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })
      : { data: [] };

  const commentUserIds = (reviewComments || []).map((comment: any) => comment.user_id);
  const { data: commentProfiles } =
    commentUserIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, role')
          .in('id', commentUserIds)
      : { data: [] };

  const { data: reviewReactions } =
    reviewIds.length > 0
      ? await supabase
          .from('review_reactions')
          .select('review_id, user_id, reaction')
          .in('review_id', reviewIds)
      : { data: [] };

  const profileMap = new Map(
    ((reviewProfiles as any[]) || []).map((profile) => [profile.id, profile])
  );

  const commentProfileMap = new Map(
    ((commentProfiles as any[]) || []).map((profile) => [profile.id, profile])
  );

  const mediaMap = new Map<string, { media_type: 'image' | 'video'; media_url: string }[]>();
  (reviewMedia || []).forEach((item: any) => {
    if (!mediaMap.has(item.review_id)) mediaMap.set(item.review_id, []);
    mediaMap.get(item.review_id)?.push({
      media_type: item.media_type,
      media_url: item.media_url,
    });
  });

  const commentsMap = new Map<
    string,
    {
      id: string;
      message: string;
      user_name: string;
      user_avatar: string | null;
      user_role: string | null;
      created_at: string;
    }[]
  >();

  (reviewComments || []).forEach((comment: any) => {
    const profile = commentProfileMap.get(comment.user_id);
    const name = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      : 'Пользователь';
    if (!commentsMap.has(comment.review_id)) commentsMap.set(comment.review_id, []);
    commentsMap.get(comment.review_id)?.push({
      id: comment.id,
      message: comment.message,
      user_name: name || 'Пользователь',
      user_avatar: profile?.avatar_url || null,
      user_role: profile?.role ?? null,
      created_at: comment.created_at,
    });
  });

  const reviewItems = reviewItemsRaw.map((review) => {
    const profile = profileMap.get(review.user_id);
    const name = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      : 'Пользователь';
    const reactions = (reviewReactions || []).filter(
      (reaction: any) => reaction.review_id === review.id
    );
    const likeCount = reactions.filter((reaction: any) => reaction.reaction === 'like').length;
    const dislikeCount = reactions.filter((reaction: any) => reaction.reaction === 'dislike').length;
    const userReaction = user
      ? reactions.find((reaction: any) => reaction.user_id === user.id)?.reaction || null
      : null;

    return {
      id: review.id,
      user_name: name || 'Пользователь',
      user_avatar: profile?.avatar_url || null,
      user_role: profile?.role ?? null,
      created_at: review.created_at,
      rating: review.rating,
      text: review.text,
      media: mediaMap.get(review.id) || [],
      like_count: likeCount,
      dislike_count: dislikeCount,
      user_reaction: userReaction,
      comments: commentsMap.get(review.id) || [],
    };
  });

  const reviewCount = reviewItems.length;
  const averageRating =
    reviewCount > 0
      ? reviewItems.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0;


  const showBookingSidebar = participantArchiveMode || bookingSidebarView !== null;
  const sidebarStartDate =
    bookingSidebarView?.startDate ?? t.start_date ?? null;
  const sidebarEndDate =
    bookingSidebarView?.endDate ?? t.end_date ?? null;
  const sidebarVariant = bookingSidebarView?.variant ?? 'participant';
  const sidebarMode = bookingSidebarView?.mode ?? 'archive';
  const characteristicsStartLabel = showBookingSidebar && sidebarStartDate
    ? formatDateTimeShortRu(sidebarStartDate)
    : formatDateTimeShortRu(t.start_date);
  const fallbackDurationLabel = showBookingSidebar && sidebarStartDate
    ? tourDurationLabel(sidebarStartDate, sidebarEndDate)
    : tourDurationLabel(t.start_date, t.end_date ?? null);

  return (
    <div className="min-h-screen bg-gray-50 relative w-full">
      <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12 max-w-7xl w-full overflow-x-hidden">
        {/* Кнопка назад: отступ сверху под fixed Header, стиль как в каталоге туров */}
        <Link
          href="/tours"
          className="group relative z-10 inline-flex items-center gap-2 sm:gap-3 text-gray-900 hover:text-emerald-600 transition-all duration-200 mb-6 sm:mb-8 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-emerald-300 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-200 flex-shrink-0" />
          <span className="font-bold text-sm sm:text-base">Назад к турам</span>
        </Link>

        {bookingRedirectError && (
          <TourBookingRedirectBanner code={bookingRedirectError} />
        )}

        <TourSessionsProvider
          sessions={tourSessions}
          initialSessionId={initialSessionId}
        >
        <div className="mt-4 sm:mt-6 flex flex-col md:flex-col lg:flex-row gap-6 sm:gap-8 w-full items-start">
          <div className="w-full md:w-full lg:w-[320px] xl:w-[380px] 2xl:w-[400px] flex-shrink-0">
            {showBookingSidebar ? (
              <TourBookingSidebarCard
                startDate={sidebarStartDate}
                endDate={sidebarEndDate}
                variant={sidebarVariant}
                mode={sidebarMode}
              />
            ) : (
              <TourScheduleBooking
                tourId={t.id}
                price={t.price_per_person}
                tourMaxParticipants={t.max_participants}
                tourCurrentParticipants={t.current_participants || 0}
                shareTitle={t.title}
              />
            )}
          </div>

          <div className="flex-1 space-y-6 sm:space-y-8 w-full min-w-0">
            <TourHeaderCard
              coverImage={t.cover_image}
              title={t.title}
              shortDesc={t.short_desc}
              tourType={t.tour_type}
              category={t.category}
            />

            <TourCharacteristicsSectionConnected
              fallbackStartDateLabel={characteristicsStartLabel}
              fallbackDurationLabel={fallbackDurationLabel}
              fallbackMaxParticipants={t.max_participants}
              priceLabel={`${t.price_per_person.toLocaleString('ru-RU')} ₽`}
            />

            <TourDescriptionSection
              html={t.full_desc || t.description || t.short_desc || ''}
            />

            <TourMediaGallery
              photos={(photos || []).map((photo: any) => ({
                id: photo.id,
                media_url: photo.media_url,
                file_name: photo.file_name,
              }))}
            />

            <TourVideoSection
              videos={(videos || []).map((video: any) => ({
                id: video.id,
                media_url: video.media_url,
                mime_type: video.mime_type,
                file_name: video.file_name,
              }))}
            />

            {t.yandex_map_url && <TourMapSection yandexMapUrl={t.yandex_map_url} />}

            <TourReviewsSection
              reviews={reviewItems}
              reviewCount={reviewCount}
              averageRating={averageRating}
              readOnly={showBookingSidebar}
            />
          </div>
        </div>
        </TourSessionsProvider>
      </div>
    </div>
  );
}
