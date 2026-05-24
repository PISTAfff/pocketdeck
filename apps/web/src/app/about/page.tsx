/**
 * /about
 *
 * The story behind PocketDeck - press-style long-read with a few
 * sticker accents and inline stats. Static page, no client state.
 */
import Link from 'next/link';

export const metadata = {
  title: 'About — PocketDeck',
  description: 'The story behind the 96mm fingerboard built for the desk.',
};

export default function AboutPage() {
  return (
    <main className="relative z-10 min-h-screen bg-ink-950 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.28em] text-bone-50/60 uppercase hover:text-ember-500"
        >
          ← back to PocketDeck
        </Link>

        <p className="mt-10 font-mono text-[11px] tracking-[0.32em] text-ember-500 uppercase">
          PocketDeck, since 2026
        </p>
        <h1 className="display-headline mt-3 text-5xl md:text-7xl">
          A skatepark on{' '}
          <span className="text-ember-500">your desk.</span>
        </h1>

        <p className="caption mt-8 text-lg leading-relaxed text-bone-50/80">
          PocketDeck started as a way to keep moving when the city wouldn't.
          One designer, one workshop in Cairo, and a stack of seven-ply
          maple. The first hundred decks were given to friends who would
          actually flick them.
        </p>

        <section className="mt-16 grid grid-cols-3 gap-6 border-y border-bone-50/10 py-8 text-center">
          <Stat n="96" unit="mm" label="length" />
          <Stat n="350" unit="EGP" label="starting price" />
          <Stat n="48" unit="hrs" label="next-day ship" />
        </section>

        <section className="mt-16 space-y-6 text-base leading-relaxed text-bone-50/75">
          <h2 className="display-headline text-3xl md:text-4xl">Why 96mm.</h2>
          <p>
            96mm is the universal standard for shop-bought fingerboard parts.
            We could have gone wider for "feel" or shorter for novelty.
            Neither would let you swap trucks with anything you already own.
            Standards are kind to the people who'll use what you make.
          </p>

          <h2 className="display-headline mt-12 text-3xl md:text-4xl">No batteries.</h2>
          <p>
            Every product gets pitched as smart now. We don't think a desk
            toy needs a firmware update. The whole pleasure is direct
            input. Tap the tail, the deck snaps. No app between you and the
            kickflip.
          </p>

          <h2 className="display-headline mt-12 text-3xl md:text-4xl">Made in Cairo.</h2>
          <p>
            Every PocketDeck is pressed, sanded, and gripped here. We
            ship same-week to Cairo, Giza, and Alexandria; everywhere
            else in Egypt is two to four days. International is on the
            roadmap once we are confident the deck survives a flight.
          </p>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <Link
            href="/#configurator"
            className="rounded-full bg-ember-500 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-ink-950 uppercase transition-opacity hover:opacity-90"
          >
            Configure yours →
          </Link>
          <Link
            href="/faq"
            className="rounded-full border border-bone-50/15 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-bone-50 uppercase transition-colors hover:bg-white/5"
          >
            FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ n, unit, label }: { n: string; unit: string; label: string }) {
  return (
    <div>
      <p className="text-5xl font-bold text-bone-50">
        {n}
        <span className="ml-1 text-xl text-bone-50/40">{unit}</span>
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.24em] text-bone-50/40 uppercase">
        {label}
      </p>
    </div>
  );
}
