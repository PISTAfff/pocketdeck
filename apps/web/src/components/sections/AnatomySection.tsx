'use client';

/**
 * Anatomy, a scroll-driven part showcase.
 *
 * The section is five viewports tall. While its top reaches the viewport top
 * we pin the inner stage and advance through the five parts as the user
 * scrolls. Each part:
 *   - lights up the matching component on the 3D deck (via highlightPart)
 *   - reveals its own detail card on the left
 *   - bumps the progress chip "01 / 05" up by one
 *
 * On mobile (no pin) every part renders as its own panel in a normal
 * vertical scroll.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { useSceneStore, type DeckPart } from '@/store/scene';

interface AnatomyPart {
  id: DeckPart | 'bearings';
  /** The 3D part the deck should light up. Bearings live inside wheels so they share. */
  highlight: DeckPart;
  index: string;
  label: string;
  spec: string;
  detail: string;
}

const PARTS: readonly AnatomyPart[] = [
  {
    id: 'deck',
    highlight: 'deck',
    index: '01',
    label: 'Deck',
    spec: '7-ply Canadian maple · CNC nose + tail concave',
    detail:
      'Pressed at 280 psi for three hours, then cured for a week. The same recipe a full-size board uses, just shrunk to 96 mm.',
  },
  {
    id: 'truck',
    highlight: 'truck',
    index: '02',
    label: 'Trucks',
    spec: 'Cast aluminum hangers · hand-tuned bushings',
    detail:
      'Two trucks per board. We tune the bushings tight out of the box so first-time riders get predictable turn-in without flapping.',
  },
  {
    id: 'wheel',
    highlight: 'wheel',
    index: '03',
    label: 'Wheels',
    spec: 'Urethane 7.7 mm · bearing-true rounds',
    detail:
      'Five colorways, same hardness. Soft enough to grip the deck on slow flicks, hard enough to roll cleanly across glass and wood.',
  },
  {
    id: 'bearings',
    highlight: 'wheel',
    index: '04',
    label: 'Bearings',
    spec: 'Steel ABEC-7 · pre-lubed · sealed',
    detail:
      'Eight bearings, two per wheel. Sealed so desk dust never makes it past the cage. Re-lubable when you wear them in.',
  },
  {
    id: 'grip',
    highlight: 'grip',
    index: '05',
    label: 'Grip',
    spec: 'Silicon carbide · three textures',
    detail:
      'Classic black for grit, Tiger for orange contrast, Topo for fingertip topography. Adhesive backing rated for desk humidity.',
  },
];

export function AnatomySection() {
  const ScrollTrigger = useScrollTrigger();
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const setExploded = useSceneStore((s) => s.setExploded);
  const setHighlightPart = useSceneStore((s) => s.setHighlightPart);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: '+=400%',
          pin: stage,
          pinSpacing: true,
          scrub: false,
          snap: {
            snapTo: 1 / (PARTS.length - 1),
            duration: { min: 0.18, max: 0.45 },
            ease: 'power2.inOut',
          },
          onEnter: () => {
            setActiveSection('anatomy');
            setExploded(true);
          },
          onEnterBack: () => {
            setActiveSection('anatomy');
            setExploded(true);
          },
          onLeave: () => {
            setExploded(false);
            setHighlightPart(null);
          },
          onLeaveBack: () => {
            setExploded(false);
            setHighlightPart(null);
          },
          onUpdate: (self) => {
            const i = Math.min(
              PARTS.length - 1,
              Math.round(self.progress * (PARTS.length - 1)),
            );
            setActiveIndex(i);
            setHighlightPart(PARTS[i]!.highlight);
          },
        });
      }, section);

      return () => ctx.revert();
    });

    return () => {
      mm.revert();
      setExploded(false);
      setHighlightPart(null);
    };
  }, [ScrollTrigger, setActiveSection, setExploded, setHighlightPart]);

  const active = PARTS[activeIndex] ?? PARTS[0]!;

  return (
    <section
      ref={sectionRef}
      id="anatomy"
      className="relative px-6 sm:px-10 md:px-14"
    >
      {/* Desktop: pinned stage, five viewports of scroll progresses through parts */}
      <div
        ref={stageRef}
        className="hidden min-h-screen flex-col justify-between py-24 md:flex"
      >
        <header className="mx-auto flex w-full max-w-[1400px] items-end justify-between">
          <div>
            <span className="tape inline-block">02 · anatomy</span>
            <h2
              className="display-headline mt-6 text-bone-50"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              Five parts.
              <br />
              <span className="text-ember-500">One pocket.</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
              Part {active.index} / 05
            </p>
            <div className="mt-3 flex justify-end gap-1.5" aria-hidden>
              {PARTS.map((p, i) => (
                <span
                  key={p.id}
                  className={clsx(
                    'h-1 w-8 rounded-full transition-colors',
                    i < activeIndex && 'bg-ember-500',
                    i === activeIndex && 'bg-ember-400/80',
                    i > activeIndex && 'bg-bone-50/10',
                  )}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[1fr_1fr] items-center gap-12">
          <AnimatePresence mode="wait">
            <motion.article
              key={active.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
              className="max-w-md"
            >
              <span className="font-mono text-sm tracking-[0.32em] text-ember-500 uppercase tabular-nums">
                {active.index}
              </span>
              <h3
                className="display-headline mt-4 text-bone-50"
                style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
              >
                {active.label}
              </h3>
              <p className="mt-4 font-mono text-[11px] tracking-[0.24em] text-ember-400 uppercase">
                {active.spec}
              </p>
              <p className="mt-6 max-w-md font-sans text-base leading-relaxed text-bone-100">
                {active.detail}
              </p>
            </motion.article>
          </AnimatePresence>

          {/* Right column reserved for the 3D part — canvas renders the
              highlighted part here. */}
          <div aria-hidden className="h-[60vh]" />
        </div>

        {/* Scroll cue at the bottom */}
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
          <p className="font-mono text-[11px] tracking-[0.4em] text-bone-300 uppercase">
            {activeIndex < PARTS.length - 1
              ? 'Scroll for next part'
              : 'Scroll to configure your build'}
          </p>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
            <span aria-hidden className="h-px w-12 bg-ember-500" />
            <span>↓</span>
          </div>
        </div>
      </div>

      {/* Mobile: every part stacks vertically. No pin. */}
      <div className="flex flex-col gap-16 py-20 md:hidden">
        <div>
          <span className="tape inline-block">02 · anatomy</span>
          <h2
            className="display-headline mt-6 text-bone-50"
            style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)' }}
          >
            Five parts.
            <br />
            <span className="text-ember-500">One pocket.</span>
          </h2>
        </div>
        {PARTS.map((p) => (
          <article key={p.id} className="border-l-2 border-ember-500/40 pl-4">
            <span className="font-mono text-xs tracking-[0.32em] text-ember-500 uppercase">
              {p.index}
            </span>
            <h3
              className="display-headline mt-2 text-bone-50"
              style={{ fontSize: 'clamp(2rem, 8vw, 3rem)' }}
            >
              {p.label}
            </h3>
            <p className="mt-3 font-mono text-[11px] tracking-[0.24em] text-ember-400 uppercase">
              {p.spec}
            </p>
            <p className="mt-3 font-sans text-sm text-bone-100">{p.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
