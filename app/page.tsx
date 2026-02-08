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
  const supabase = await createServiceClient();
  const now = new Date().toISOString();
  const { data: popularTours } = await supabase
    .from('tours')
    .select('title, slug, price_per_person, start_date, end_date, current_participants')
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('current_participants', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const popularTourItems = (popularTours || []).map((tour) => ({
    title: tour.title,
    slug: tour.slug,
    price: tour.price_per_person,
    startDateLabel: tour.start_date
      ? new Date(tour.start_date).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: 'long',
        })
      : null,
  }));

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
