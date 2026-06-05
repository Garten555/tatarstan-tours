import { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedTours } from '@/components/home/FeaturedTours';
import { StatsSection } from '@/components/home/StatsSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogTourRows,
  pickHeroNearestTours,
} from '@/lib/tours/active-catalog-listing';
import AuthAwareCTA from '../components/home/AuthAwareCTA';

export default async function Home() {
  noStore();
  const supabase = createServiceClient();
  const catalogRows = await fetchActiveCatalogTourRows(supabase);
  const popularTourItems = pickHeroNearestTours(catalogRows, 5);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
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
