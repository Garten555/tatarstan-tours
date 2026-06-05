import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedTours } from '@/components/home/FeaturedTours';
import { StatsSection } from '@/components/home/StatsSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { getHomeCatalogData } from '@/lib/tours/home-catalog';
import AuthAwareCTA from '../components/home/AuthAwareCTA';

/** Кэш главной: быстрый повторный заход; Pusher + revalidatePath сбрасывают при смене туров. */
export const revalidate = 45;

export default async function Home() {
  const { heroTours, featuredTours, featuredTotal } = await getHomeCatalogData();

  return (
    <main>
      <HeroSection popularTours={heroTours} />
      <StatsSection />
      <WhyUsSection />
      <FeaturedTours tours={featuredTours} totalAvailableTours={featuredTotal} />
      <HowItWorksSection />
      <TestimonialsSection />
      <AuthAwareCTA />
    </main>
  );
}
