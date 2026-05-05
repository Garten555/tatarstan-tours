export const revalidate = 60;
import { Suspense } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedTours } from '@/components/home/FeaturedTours';
import { StatsSection } from '@/components/home/StatsSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { createServiceClient } from '@/lib/supabase/server';
import AuthAwareCTA from '../components/home/AuthAwareCTA';

export default async function Home() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: popularTours } = await supabase
    .from('tours')
    .select('title, slug, price_per_person, start_date, end_date, current_participants')
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('current_participants', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const popularTourItems = (popularTours || []).map((tour: Record<string, unknown>) => {
    const start = tour.start_date ? String(tour.start_date) : '';
    const endRaw = tour.end_date != null ? String(tour.end_date) : start;
    let durationLabel: string | null = null;
    if (start) {
      const s = new Date(start);
      const e = new Date(endRaw);
      const diffMs = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const h = Math.ceil(diffMs / (1000 * 60 * 60));
        durationLabel = h > 0 ? `${h} ч` : '1 день';
      } else {
        durationLabel = `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
      }
    }
    return {
      title: String(tour.title ?? ''),
      slug: tour.slug ? String(tour.slug) : undefined,
      price: typeof tour.price_per_person === 'number' ? tour.price_per_person : null,
      durationLabel,
      startDateLabel: start
        ? new Date(start).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
          })
        : null,
    };
  });

  return (
    <main>
      <HeroSection popularTours={popularTourItems} />
      <StatsSection />
      <WhyUsSection />
      <Suspense
        fallback={
          <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden bg-white">
            <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
              <div className="h-10 w-56 bg-gray-100 rounded animate-pulse mb-6" />
              <div className="h-6 w-96 bg-gray-100 rounded animate-pulse mb-10" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-52 bg-gray-50 border border-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <FeaturedTours />
      </Suspense>
      <HowItWorksSection />
      <TestimonialsSection />
      <AuthAwareCTA />
    </main>
  );
}
