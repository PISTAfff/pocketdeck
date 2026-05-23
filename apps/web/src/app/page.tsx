/**
 * Home page — Phase 1 placeholder.
 *
 * Phase 2C will replace this with the real assembled sections:
 *   <HeroSection />, <ManifestoSection />, <AnatomySection />,
 *   <ConfiguratorSection />, <TricksSection />, <OrderSection />, <Footer />
 *
 * Each section is a standalone component that may register scroll keyframes
 * with the scene controller (Phase 2B) via the Zustand store.
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-bone-300">
          pocketdeck — 0.1.0
        </p>
        <h1 className="mt-4 text-5xl font-semibold text-bone-50 md:text-7xl">
          Scaffold ready.
        </h1>
        <p className="mt-4 max-w-md text-sm text-bone-300">
          Phase 1 complete. The monorepo, contract, and shared types are in place.
          Run <code className="font-mono text-ember-400">pnpm dev</code> to start
          both apps.
        </p>
      </section>
    </main>
  );
}
