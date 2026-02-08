export const revalidate = 60
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import TourHeaderCard from '@/components/tours/TourHeaderCard';
import TourBookingCard from '@/components/tours/TourBookingCard';
import TourDescriptionSection from '@/components/tours/TourDescriptionSection';
import TourCharacteristicsSection from '@/components/tours/TourCharacteristicsSection';
import TourMediaGallery from '@/components/tours/TourMediaGallery';
import TourVideoSection from '@/components/tours/TourVideoSection';
import TourMapSection from '@/components/tours/TourMapSection';
import TourReviewsSection from '@/components/tours/TourReviewsSection';
import { ArrowLeft } from 'lucide-react';

interface TourPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TourPage({ params }: TourPageProps) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  // Получаем данные тура
  const { data: tour, error } = await supabase
    .from('tours')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !tour) {
    notFound();
  }

  const t = tour as any;

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
  const videos = mediaTyped.filter((m) => m.media_type === 'video');

  const availableSpots = t.max_participants - (t.current_participants || 0);
  const isFullyBooked = availableSpots <= 0;

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
          .select('id, first_name, last_name, avatar_url')
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
          .select('id, first_name, last_name, avatar_url')
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
    { id: string; message: string; user_name: string; user_avatar: string | null; created_at: string }[]
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

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Вычисляем продолжительность
  const getDuration = () => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
    }
    
    return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 relative w-full">
      <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-7xl w-full overflow-x-hidden">
        {/* Кнопка назад с улучшенным дизайном */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 sm:gap-3 text-gray-700 hover:text-emerald-600 transition-all duration-200 mb-6 sm:mb-8 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-white hover:shadow-lg border-2 border-gray-200 hover:border-emerald-200"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-200 flex-shrink-0" />
          <span className="font-bold text-sm sm:text-base">Назад на главную</span>
        </Link>

        <div className="mt-4 sm:mt-6 flex flex-col lg:flex-row gap-6 sm:gap-8 w-full items-start">
          <div className="w-full lg:w-[320px] xl:w-[380px] flex-shrink-0">
            <TourBookingCard
              price={t.price_per_person}
              availableSpots={availableSpots}
              maxParticipants={t.max_participants}
              isFullyBooked={isFullyBooked}
              bookingHref={`/booking?tour=${t.id}`}
            />
          </div>

          <div className="flex-1 space-y-6 sm:space-y-8 w-full min-w-0">
            <TourHeaderCard
              coverImage={t.cover_image}
              title={t.title}
              shortDesc={t.short_desc}
              tourType={t.tour_type}
              category={t.category}
            />

            <TourCharacteristicsSection
              startDateLabel={formatDate(t.start_date)}
              durationLabel={getDuration()}
              maxParticipants={t.max_participants}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
