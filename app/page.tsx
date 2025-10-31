export const revalidate = 60
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedTours } from '@/components/home/FeaturedTours';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturedTours />
    </main>
  );
}
