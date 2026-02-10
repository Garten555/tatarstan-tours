import TourReviews from '@/components/reviews/TourReviews';

type TourReviewsSectionProps = {
  reviews: {
    id: string;
    user_name: string;
    user_avatar: string | null;
    created_at: string;
    rating: number;
    text: string | null;
    media: { media_type: 'image' | 'video'; media_url: string }[];
    like_count: number;
    dislike_count: number;
    user_reaction: 'like' | 'dislike' | null;
    comments: {
      id: string;
      message: string;
      user_name: string;
      user_avatar: string | null;
      created_at: string;
    }[];
  }[];
  reviewCount: number;
  averageRating: number;
};

export default function TourReviewsSection({
  reviews,
  reviewCount,
  averageRating,
}: TourReviewsSectionProps) {
  return (
    <section>
      <TourReviews
        reviews={reviews}
        reviewCount={reviewCount}
        averageRating={averageRating}
      />
    </section>
  );
}













