/**
 * Home, the single PocketDeck experience.
 *
 * Sections are assembled here in order. ChromeRoot (in layout.tsx) renders the
 * Nav at the top and the Footer below children. The persistent WebGL scene
 * is fixed-position behind every section.
 */
import { HeroSection } from '@/components/sections/HeroSection';
import { ManifestoSection } from '@/components/sections/ManifestoSection';
import { AnatomySection } from '@/components/sections/AnatomySection';
import { ConfiguratorSection } from '@/components/sections/ConfiguratorSection';
import { TricksSection } from '@/components/sections/TricksSection';
import { OrderSection } from '@/components/sections/OrderSection';

export default function HomePage() {
  return (
    <main className="relative">
      <HeroSection />
      <ManifestoSection />
      <AnatomySection />
      <ConfiguratorSection />
      <TricksSection />
      <OrderSection />
    </main>
  );
}
