export const revalidate = 60;
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedTours } from '@/components/home/FeaturedTours';
import { StatsSection } from '@/components/home/StatsSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { CTASection } from '@/components/home/CTASection';
import { createServiceClient, createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const supabaseAuth = await createClient();

  const [{ data: popularTours }, { data: { user } }] = await Promise.all([
    supabase
      .from('tours')
      .select('title, slug, price_per_person, start_date, end_date, current_participants')
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('current_participants', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAuth.auth.getUser(),
  ]);

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
      <FeaturedTours />
      <HowItWorksSection />
      <TestimonialsSection />
      {!user && <CTASection />}
    </main>
  );
}
