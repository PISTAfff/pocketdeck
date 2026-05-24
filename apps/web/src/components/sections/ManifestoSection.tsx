'use client';

/**
 * Manifesto, 2x2 declaration grid.
 *
 * No pin (#14): the section flows in normal scroll. Each declaration cell
 * lays out as: oversized ember number, condensed display title, a short
 * supporting sentence (#15). Text cells carry the `.text-tint` backdrop so
 * they remain legible over the 30 %-opacity deck rendered behind them by
 * the scene's per-section opacity cap (#16).
 *
 * Contrast: bone-50 is set to #f5f5f0 at the global theme level so the
 * declaration titles measure well above WCAG AA against ink-950 (#17).
 */
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { useSceneStore } from '@/store/scene';
import { StreetSprite } from '@/components/ui/StreetSprite';

interface Declaration {
  index: string;
  title: string;
  note: string;
}

const DECLARATIONS: readonly Declaration[] = [
  {
    index: '01',
    title: 'No batteries.',
    note: 'Charge it once: with a flick. Then ride for years.',
  },
  {
    index: '02',
    title: 'No screens.',
    note: 'Nothing to update, nothing to lock you out, nothing to dim.',
  },
  {
    index: '03',
    title: 'No app to update.',
    note: 'What you press is what it does. Direct, every time.',
  },
  {
    index: '04',
    title: 'Just bearings, maple, and inertia.',
    note: 'Three real materials. Zero firmware. All physics.',
  },
];

export function ManifestoSection() {
  const ScrollTrigger = useScrollTrigger();
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const sectionRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;

    const ctx = gsap.context(() => {
      const cells = grid.querySelectorAll<HTMLElement>('[data-declaration]');
      gsap.set(cells, { autoAlpha: 0, y: 24 });
      ScrollTrigger.batch(cells, {
        start: 'top 82%',
        onEnter: (els) =>
          gsap.to(els, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'power2.out',
          }),
        onLeaveBack: (els) =>
          gsap.to(els, { autoAlpha: 0, y: 24, duration: 0.4 }),
      });

      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setActiveSection('manifesto'),
        onEnterBack: () => setActiveSection('manifesto'),
      });
    }, section);

    return () => ctx.revert();
  }, [ScrollTrigger, setActiveSection]);

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      className="relative px-6 py-24 sm:px-10 md:px-14 md:py-24"
    >
      {/* Street-sprite scatter for the manifesto */}
      <StreetSprite
        kind="arrow"
        size={44}
        color="ember"
        rotate={-8}
        hover="jitter"
        className="absolute top-16 right-[8%] z-0"
      />
      <StreetSprite
        kind="ring"
        size={32}
        color="bone"
        rotate={0}
        hover="pulse"
        className="absolute top-[42%] left-4 z-0 md:left-10"
      />
      <StreetSprite
        kind="tri"
        size={20}
        color="ember"
        rotate={-25}
        hover="wiggle"
        className="absolute bottom-32 right-[14%] z-0"
      />
      <StreetSprite
        kind="wave"
        size={64}
        color="mute"
        rotate={0}
        hover="none"
        className="absolute bottom-12 left-[35%] z-0 hidden md:inline-flex"
      />

      <div className="mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-tint max-w-2xl"
        >
          <span className="tape inline-block">01 · manifesto</span>
          <h2
            className="display-headline mt-8 text-bone-50"
            style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5.5rem)' }}
          >
            Built to fidget,
            <br />
            tuned to <span className="spray-text text-ember-500">ride</span>.
          </h2>
        </motion.div>

        <div
          ref={gridRef}
          className="mt-16 grid gap-x-12 gap-y-16 md:mt-24 md:grid-cols-2"
        >
          {DECLARATIONS.map((d) => (
            <article
              key={d.index}
              data-declaration
              className="text-tint flex flex-col gap-4"
            >
              <p className="display-headline text-ember-500 text-7xl md:text-8xl">
                {d.index}
              </p>
              <h3
                className="display-headline text-bone-50"
                style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.75rem)' }}
              >
                {d.title}
              </h3>
              <p
                className="max-w-md font-sans text-base text-bone-50"
                style={{ lineHeight: 'var(--leading-body)' }}
              >
                {d.note}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
