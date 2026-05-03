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
    .select(
      `
      id,
      title,
      slug,
      short_desc,
      cover_image,
      price_per_person,
      start_date,
      end_date,
      max_participants,
      current_participants,
      tour_type,
      category
    `
    )
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('current_participants', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const FALLBACK_COVER = '/hero-tatarstan.jpg';
  const popularTourCards = (popularTours || [])
    .filter((t: { slug?: string | null }) => Boolean(t.slug))
    .map(
      (tour: {
        id: string;
        title: string;
        slug: string;
        short_desc?: string | null;
        cover_image?: string | null;
        price_per_person: number;
        start_date: string;
        end_date?: string | null;
        max_participants: number;
        current_participants?: number | null;
        tour_type: string;
        category: string;
      }) => ({
        id: tour.id,
        title: tour.title,
        slug: tour.slug,
        short_desc: (tour.short_desc || '').trim() || 'Тур по Татарстану',
        cover_image: tour.cover_image?.trim() || FALLBACK_COVER,
        price_per_person: tour.price_per_person,
        start_date: tour.start_date,
        end_date: tour.end_date || tour.start_date,
        max_participants: tour.max_participants,
        current_participants: tour.current_participants ?? 0,
        tour_type: tour.tour_type || 'excursion',
        category: tour.category || 'culture',
      })
    );

  return (
    <main>
      <HeroSection popularTourCards={popularTourCards} />
      <StatsSection />
      <WhyUsSection />
      <FeaturedTours />
      <HowItWorksSection />
      <TestimonialsSection />
      {!user && <CTASection />}
    </main>
  );
}
