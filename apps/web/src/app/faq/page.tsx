'use client';

/**
 * /faq
 *
 * Frequently asked questions. Accordion-style with a sticky table of
 * contents for fast scanning.
 */
import { useState } from 'react';
import Link from 'next/link';

interface FAQ {
  id: string;
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    id: 'sizes',
    q: 'What is the deck size?',
    a: 'Every PocketDeck ships at 96mm long by 28mm wide. It is the standard fingerboard format so off-the-shelf bearings, wheels and risers fit it.',
  },
  {
    id: 'materials',
    q: 'What are the materials?',
    a: 'Seven-ply Canadian maple plate, silicon-carbide grip, sealed steel ABEC-7 bearings, aluminum trucks, and urethane wheels. No batteries, no firmware, no app.',
  },
  {
    id: 'shipping',
    q: 'How long does shipping take?',
    a: 'Cairo, Giza, and Alexandria ship next-day. Everywhere else in Egypt is 2 to 4 days. We confirm by phone before dispatch.',
  },
  {
    id: 'payment',
    q: 'How do I pay?',
    a: 'Cash on delivery across Egypt for now. International cards and Instapay are on the roadmap.',
  },
  {
    id: 'returns',
    q: 'Returns?',
    a: 'Unboxed and unridden: full refund inside 14 days. Ridden: case-by-case for manufacturing defects, not for setup preferences (truck tightness, riser, bearings).',
  },
  {
    id: 'customize',
    q: 'Can I change my order after confirming?',
    a: 'Until we mark it confirmed in the queue, yes - call us and we will swap parts. Once it is shipped, the build is final.',
  },
  {
    id: 'replacement',
    q: 'Replacement parts?',
    a: 'Wheels and bearings ship as a pair. Trucks ship as a set of two. Decks are sold as full builds only.',
  },
  {
    id: 'tricks',
    q: 'Will this land my kickflip?',
    a: 'PocketDeck is a tool. The flick is on you.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>(FAQS[0]?.id ?? null);

  return (
    <main className="relative z-10 min-h-screen bg-ink-950 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.28em] text-bone-50/60 uppercase hover:text-ember-500"
        >
          ← back to PocketDeck
        </Link>

        <h1 className="display-headline mt-8 text-5xl md:text-6xl">
          Things you'll{' '}
          <span className="text-ember-500">probably ask.</span>
        </h1>
        <p className="caption mt-4 max-w-2xl text-bone-50/70">
          Quick answers. If yours isn't here, hit us up on socials.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
          {/* Section index. On desktop it's a sticky vertical list to
              the left of the answers. On mobile it becomes a horizontal
              scroll-snap row above the accordion so it still aids nav
              without burning a full screen of height. */}
          <nav
            aria-label="FAQ sections"
            className="self-start md:sticky md:top-28 md:border-r md:border-bone-50/10 md:pr-6"
          >
            <ol className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:block md:space-y-1 md:overflow-visible md:px-0 md:pb-0">
              {FAQS.map((f, i) => (
                <li key={f.id} className="snap-start md:snap-align-none">
                  <button
                    onClick={() => {
                      setOpen(f.id);
                      const el = document.getElementById(`faq-${f.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`flex w-full min-w-[12rem] shrink-0 items-baseline gap-3 rounded-md border border-bone-50/10 bg-white/[0.02] px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 md:min-w-0 md:border-0 md:bg-transparent md:text-sm ${
                      open === f.id ? 'text-ember-500' : 'text-bone-50/70'
                    }`}
                  >
                    <span className="font-mono text-[10px] tracking-[0.18em] text-bone-50/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {f.q}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-3">
            {FAQS.map((f) => {
              const isOpen = open === f.id;
              return (
                <article
                  key={f.id}
                  id={`faq-${f.id}`}
                  className={`rounded-2xl border bg-white/[0.03] transition-colors ${
                    isOpen
                      ? 'border-ember-500/40'
                      : 'border-bone-50/10 hover:border-bone-50/20'
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : f.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-body-${f.id}`}
                    className="flex w-full items-baseline justify-between gap-6 px-6 py-5 text-left"
                  >
                    <h2 className="text-lg font-bold text-bone-50 md:text-xl">
                      {f.q}
                    </h2>
                    <span
                      aria-hidden
                      className={`font-mono text-[12px] tracking-[0.18em] text-bone-50/40 transition-transform ${
                        isOpen ? 'rotate-90 text-ember-500' : ''
                      }`}
                    >
                      ▸
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-body-${f.id}`}
                      className="border-t border-bone-50/10 px-6 py-5 text-base leading-relaxed text-bone-50/80"
                    >
                      {f.a}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
