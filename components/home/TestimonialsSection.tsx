import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Quote } from 'lucide-react';

type ReviewItem = {
  id: string;
  text: string | null;
  rating: number;
  user_id: string;
  created_at: string;
  tour_id?: string | null;
  tours?: { slug: string; title: string } | { slug: string; title: string }[] | null;
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

function getRatingColor(rating: number) {
  if (rating >= 4.5) return 'text-emerald-600';
  if (rating >= 3.5) return 'text-lime-600';
  if (rating >= 2.5) return 'text-amber-500';
  return 'text-rose-500';
}

export async function TestimonialsSection() {
  const supabase = await createServiceClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, text, rating, user_id, created_at, tour_id, tours (slug, title)')
    .eq('is_published', true)
    .eq('is_approved', true)
    .not('text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

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

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-white">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full bg-violet-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Заголовок */}
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

        {/* Карточки отзывов */}
        <div
          className={
            reviewItems.length > 3
              ? 'flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin'
              : 'grid grid-cols-1 md:grid-cols-3 gap-6'
          }
        >
          {reviewItems.map((item) => {
            const profile = profileMap.get(item.user_id);
            const tour = Array.isArray(item.tours) ? item.tours[0] : item.tours;
            const cardContent = (
              <div
                className={`group relative rounded-2xl bg-white border-2 border-gray-100 p-6 md:p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 min-h-[220px] ${
                  reviewItems.length > 3
                    ? 'snap-start min-w-[320px] md:min-w-[360px] lg:min-w-[380px]'
                    : ''
                }`}
              >
                {/* Иконка кавычек */}
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="w-12 h-12 text-emerald-600" />
                </div>

                {/* Текст отзыва */}
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6 relative z-10">
                  &ldquo;{item.text}&rdquo;
                </p>

                {/* Информация о пользователе */}
                <div className="flex items-center gap-4 relative z-10">
                  {profile?.avatar_url ? (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                      <Image
                        src={profile.avatar_url}
                        alt={profile.first_name || 'Пользователь'}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-sm font-bold border-2 border-emerald-100 flex-shrink-0">
                      {getInitials(profile?.first_name, profile?.last_name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-base md:text-lg font-bold text-gray-900">
                      {profile ? `${profile.first_name} ${profile.last_name}` : 'Пользователь'}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const value = index + 1;
                          const isActive = item.rating >= value;
                          return (
                            <Star
                              key={value}
                              className={isActive ? `h-4 w-4 ${getRatingColor(item.rating)} fill-current` : 'h-4 w-4 text-gray-200'}
                            />
                          );
                        })}
                      </div>
                      <span className={`text-sm font-bold ${getRatingColor(item.rating)}`}>
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );

            return tour?.slug ? (
              <Link
                key={item.id}
                href={`/tours/${tour.slug}`}
                className="block cursor-pointer"
              >
                {cardContent}
              </Link>
            ) : (
              <div key={item.id}>{cardContent}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
