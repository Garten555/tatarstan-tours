import { createServiceClient } from '@/lib/supabase/server';
import { Quote } from 'lucide-react';
import { TestimonialsSlider, type TestimonialItem } from '@/components/home/TestimonialsSlider';

type ReviewItem = {
  id: string;
  text: string | null;
  rating: number;
  user_id: string;
  created_at: string;
  tour_id?: string | null;
  tours?: {
    slug: string;
    title: string;
    status?: string | null;
    end_date?: string | null;
    start_date?: string | null;
  } | {
    slug: string;
    title: string;
    status?: string | null;
    end_date?: string | null;
    start_date?: string | null;
  }[] | null;
};

type ProfileItem = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';
  const initials = `${first}${last}`.trim();
  return initials || 'U';
}

export async function TestimonialsSection() {
  const supabase = await createServiceClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, text, rating, user_id, created_at, tour_id, tours (slug, title, status, end_date, start_date)')
    .eq('is_published', true)
    .eq('is_approved', true)
    .not('text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(24);

  const reviewItems = (reviews as ReviewItem[] | null) || [];
  const userIds = reviewItems.map((item) => item.user_id);

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds)
      : { data: [] };

  const profileMap = new Map(
    ((profiles as ProfileItem[]) || []).map((profile) => [profile.id, profile])
  );

  if (reviewItems.length === 0) {
    return (
      <section className="py-16 md:py-20 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Отзывы путешественников
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-medium">
            Пока нет отзывов. Будьте первым, кто поделится впечатлениями.
          </p>
        </div>
      </section>
    );
  }

  const sliderItems: TestimonialItem[] = reviewItems
    .filter((item) => item.text?.trim())
    .map((item) => {
      const profile = profileMap.get(item.user_id);
      const tour = Array.isArray(item.tours) ? item.tours[0] : item.tours;

      return {
        id: item.id,
        text: item.text!.trim(),
        rating: item.rating,
        userName: profile ? `${profile.first_name} ${profile.last_name}` : 'Пользователь',
        avatarUrl: profile?.avatar_url ?? null,
        initials: getInitials(profile?.first_name, profile?.last_name),
        tour: tour?.title
          ? {
              title: tour.title,
              slug: tour.slug,
              status: tour.status,
              end_date: tour.end_date,
              start_date: tour.start_date,
            }
          : null,
      };
    });

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-white">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full bg-violet-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-emerald-200/50 px-4 py-2 mb-6 shadow-sm">
            <Quote className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 text-sm font-semibold">Отзывы</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-5">
            Отзывы путешественников
          </h2>
          <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
            Реальные впечатления от туров по Татарстану
          </p>
        </div>

        <TestimonialsSlider items={sliderItems} />
      </div>
    </section>
  );
}
