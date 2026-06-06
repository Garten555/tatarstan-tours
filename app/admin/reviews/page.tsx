import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ReviewsTable from '@/components/admin/ReviewsTable';
import { fetchProfilesByIds, mapReviewAuthor, unwrapRelation } from '@/lib/reviews/profile';
import { Star } from 'lucide-react';

export const metadata = {
  title: 'Отзывы - Админ панель',
  description: 'Модерация отзывов',
};

type ReviewsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const sp = await searchParams;
  const initialStatusFilter =
    sp.status === 'pending' ||
    sp.status === 'approved' ||
    sp.status === 'reported'
      ? sp.status
      : 'all';
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const typedProfile = (profile ?? null) as { role?: string | null } | null;
  const userRole = typedProfile?.role || 'user';

  if (!['super_admin', 'support_admin', 'tour_admin'].includes(userRole)) {
    redirect('/admin');
  }

  const { data: reviews, error: reviewsError } = await serviceClient
    .from('reviews')
    .select(`
      id,
      user_id,
      tour_id,
      rating,
      text,
      is_approved,
      is_published,
      is_reported,
      created_at,
      author:profiles!reviews_user_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      tours (
        title
      ),
      review_media (
        media_type,
        media_url
      )
    `)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    console.error('[admin/reviews] load:', reviewsError.message);
  }

  interface ReviewData {
    id: string;
    user_id: string;
    tour_id: string;
    rating: number;
    text: string;
    is_approved: boolean;
    is_published: boolean;
    is_reported: boolean;
    created_at: string;
    author?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
    }[] | null;
    tours?: { title: string } | { title: string }[] | null;
    review_media?: { media_type: string; media_url: string }[] | null;
  }

  const rawReviews = (reviews || []) as ReviewData[];
  const missingAuthorIds = rawReviews
    .filter((r) => !unwrapRelation(r.author))
    .map((r) => r.user_id);
  const profileMap = await fetchProfilesByIds(serviceClient, missingAuthorIds);

  const reviewsData = rawReviews.map((review) => {
    const author = mapReviewAuthor(
      review.author,
      profileMap.get(review.user_id) ?? null,
      review.user_id
    );
    const tourData = unwrapRelation(review.tours);

    return {
      id: review.id,
      user_id: review.user_id,
      tour_id: review.tour_id,
      rating: review.rating,
      text: review.text,
      is_approved: review.is_approved,
      is_published: review.is_published,
      is_reported: review.is_reported,
      created_at: review.created_at,
      user_name: author.user_name,
      user_email: author.user_email,
      user_avatar_url: author.user_avatar_url,
      tour_title: tourData?.title || 'Тур удален',
      media: (review.review_media || []).map((m) => ({
        media_type: (m.media_type === 'image' || m.media_type === 'video' ? m.media_type : 'image') as 'image' | 'video',
        media_url: m.media_url,
      })),
    };
  });

  return (
    <div>
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-yellow-100/50 border border-yellow-200/50 rounded-xl">
            <span className="text-sm font-bold text-yellow-700">Отзывы</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Star className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" />
          Модерация отзывов
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Управление и модерация отзывов пользователей
        </p>
      </div>

      <ReviewsTable
        initialReviews={reviewsData}
        initialStatusFilter={initialStatusFilter}
      />
    </div>
  );
}
