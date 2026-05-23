'use client';

/**
 * Anatomy, scroll-driven part showcase.
 *
 * Five viewports tall on desktop. The stage pins for four viewports of scroll
 * (one per transition between parts). The user can:
 *   - scroll naturally (snap lands cleanly on each part)
 *   - click any segment of the top-right progress bar to jump (#19)
 *   - tab into the segments and use arrow keys to move between parts (#61)
 *
 * Each step lights up the matching component on the 3D deck via highlightPart
 * (the Deck reads it and adds an ember emissive glow on top of muted dimming
 * for the inactive parts, #20).
 *
 * The part copy lives on the LEFT column, the deck on the RIGHT (the anatomy
 * deck keyframes position the model in world-space right of origin). Mobile
 * stacks each part as a vertical panel with no pin.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { useSceneStore, type DeckPart } from '@/store/scene';
import { scrollToY } from '@/hooks/useLenis';

interface AnatomyPart {
  id: DeckPart | 'bearings';
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
    spec: '7-PLY CANADIAN MAPLE · CNC NOSE + TAIL CONCAVE',
    detail:
      'Pressed at 280 psi for three hours, then cured for a week. The same recipe a full-size board uses, just shrunk to 96 mm.',
  },
  {
    id: 'truck',
    highlight: 'truck',
    index: '02',
    label: 'Trucks',
    spec: 'CAST ALUMINUM HANGERS · HAND-TUNED BUSHINGS',
    detail:
      'Two trucks per board. We tune the bushings tight out of the box so first-time riders get predictable turn-in without flapping.',
  },
  {
    id: 'wheel',
    highlight: 'wheel',
    index: '03',
    label: 'Wheels',
    spec: 'URETHANE 7.7 MM · BEARING-TRUE ROUNDS',
    detail:
      'Five colorways, same hardness. Soft enough to grip the deck on slow flicks, hard enough to roll cleanly across glass and wood.',
  },
  {
    id: 'bearings',
    highlight: 'wheel',
    index: '04',
    label: 'Bearings',
    spec: 'STEEL ABEC-7 · PRE-LUBED · SEALED',
    detail:
      'Eight bearings, two per wheel. Sealed so desk dust never makes it past the cage. Re-lubable when you wear them in.',
  },
  {
    id: 'grip',
    highlight: 'grip',
    index: '05',
    label: 'Grip',
    spec: 'SILICON CARBIDE · THREE TEXTURES',
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

  /** Scroll the page so the pinned stage lands on a given part. */
  const goToPart = useCallback(
    (i: number) => {
      const section = sectionRef.current;
      if (!section) return;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const totalScroll = window.innerHeight * (PARTS.length - 1);
      const targetY =
        sectionTop + (i / (PARTS.length - 1)) * totalScroll + 2;
      scrollToY(targetY, 0.6);
    },
    [],
  );

  /** Keyboard navigation on the progress segments (#61). */
  const onSegmentKey = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPart(Math.min(PARTS.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPart(Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPart(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPart(PARTS.length - 1);
      }
    },
    [goToPart],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // no pinning under reduced-motion (#59)

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
            setExploded(false);
          },
          onEnterBack: () => {
            setActiveSection('anatomy');
            setExploded(false);
          },
          onLeave: () => {
            setHighlightPart(null);
          },
          onLeaveBack: () => {
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
      {/* Desktop: pinned stage */}
      <div
        ref={stageRef}
        className="hidden min-h-screen flex-col justify-between py-24 md:flex"
      >
        <header className="mx-auto flex w-full max-w-[1400px] items-end justify-between gap-8">
          <div className="text-tint">
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
            <div
              role="tablist"
              aria-label="Anatomy parts"
              className="mt-3 flex items-center justify-end gap-1.5"
            >
              {PARTS.map((p, i) => {
                const state =
                  i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'idle';
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={`Jump to part ${p.index}: ${p.label}`}
                    tabIndex={i === activeIndex ? 0 : -1}
                    data-cursor="link"
                    onClick={() => goToPart(i)}
                    onKeyDown={(e) => onSegmentKey(e, i)}
                    className={clsx(
                      // 32x32 min tap target via padding (#21); the visual
                      // segment is the 8x40 bar inside.
                      'group relative flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                      'focus-visible:bg-bone-50/5',
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'block h-1 w-10 rounded-full transition-colors',
                        state === 'done' && 'bg-ember-500',
                        state === 'current' &&
                          'bg-ember-400/85 ring-2 ring-ember-500/40',
                        state === 'idle' &&
                          'bg-bone-50/10 group-hover:bg-bone-50/25',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[1fr_1fr] items-center gap-12">
          {/* Crossfade slides without a gap (#23). Old + new render together;
              both absolute-positioned inside this 60vh stage so they overlap
              cleanly during the transition. */}
          <div className="relative min-h-[60vh]">
            <AnimatePresence initial={false}>
              <motion.article
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                className="text-tint absolute inset-0 flex max-w-md flex-col justify-center"
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
                {/* #24: spec is mono, 70% the size of the part name, ember
                    color. Only used in anatomy. */}
                <p
                  className="mt-4 font-mono uppercase text-ember-400"
                  style={{
                    fontSize: 'clamp(0.81rem, 1.3vw, 1.05rem)',
                    letterSpacing: '0.2em',
                    lineHeight: 'var(--leading-caption)',
                  }}
                >
                  {active.spec}
                </p>
                <p
                  className="mt-6 max-w-md font-sans text-base text-bone-50"
                  style={{ lineHeight: 'var(--leading-body)' }}
                >
                  {active.detail}
                </p>
              </motion.article>
            </AnimatePresence>
          </div>

          <div aria-hidden className="h-[60vh]" />
        </div>

        {/* Single scroll cue, bottom-right (#22). */}
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-end">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
            <span>
              {activeIndex < PARTS.length - 1
                ? 'Scroll for next'
                : 'Scroll to configure'}
            </span>
            <span aria-hidden className="h-px w-12 bg-ember-500" />
            <span aria-hidden>↓</span>
          </div>
        </div>
      </div>

      {/* Mobile: every part as its own panel */}
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
            <p
              className="mt-3 font-sans text-sm text-bone-50"
              style={{ lineHeight: 'var(--leading-body)' }}
            >
              {p.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
