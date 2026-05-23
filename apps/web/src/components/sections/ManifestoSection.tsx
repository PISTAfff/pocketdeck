'use client';

/**
 * Manifesto, scroll-pinned headline with body lines that tick through.
 *
 * The headline column pins to the top of the viewport while the body lines
 * scroll past it. `pinSpacing: true` adds the buffer ScrollTrigger needs so
 * the pin releases BEFORE the next section starts, which is what was missing
 * before (Anatomy headline was overlapping Manifesto headline during scroll).
 *
 * Below md, the pin is disabled and the section scrolls naturally.
 */
import { useEffect, useRef } from 'react';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { useSceneStore } from '@/store/scene';

const LINES = [
  'No batteries.',
  'No screens.',
  'No app to update.',
  'Just bearings, maple, and inertia.',
] as const;

export function ManifestoSection() {
  const ScrollTrigger = useScrollTrigger();
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const sectionRef = useRef<HTMLElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const lines = linesRef.current;
    if (!section || !headline || !lines) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const ctx = gsap.context(() => {
        const lineEls = lines.querySelectorAll<HTMLElement>('[data-manifesto-line]');
        gsap.set(lineEls, { autoAlpha: 0, y: 40 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=100%',
            pin: headline,
            pinSpacing: true,
            scrub: 0.6,
            onEnter: () => setActiveSection('manifesto'),
            onEnterBack: () => setActiveSection('manifesto'),
          },
        });

        lineEls.forEach((el, i) => {
          tl.to(el, { autoAlpha: 1, y: 0, duration: 1 }, i * 0.6);
          if (i < lineEls.length - 1) {
            tl.to(el, { autoAlpha: 0.22, duration: 0.6 }, i * 0.6 + 0.7);
          }
        });
      }, section);

      return () => ctx.revert();
    });

    mm.add('(max-width: 767px)', () => {
      // Mobile: simple in-view reveal, no pin.
      const ctx = gsap.context(() => {
        const lineEls = lines.querySelectorAll<HTMLElement>('[data-manifesto-line]');
        gsap.set(lineEls, { autoAlpha: 0, y: 24 });
        ScrollTrigger.batch(lineEls, {
          start: 'top 80%',
          onEnter: (els) =>
            gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }),
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
    });

    return () => {
      mm.revert();
      ScrollTrigger.refresh();
    };
  }, [ScrollTrigger, setActiveSection]);

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      className="relative px-6 py-32 sm:px-10 md:px-14 md:py-40"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[1fr_1.4fr] md:gap-20">
        <div ref={headlineRef} className="md:h-[80vh] md:py-[10vh]">
          <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
            01 / manifesto
          </p>
          <h2
            className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            Built to fidget,
            <br />
            tuned to <span className="text-ember-500">ride</span>.
          </h2>
        </div>
        <div ref={linesRef} className="flex flex-col gap-10 pt-2 md:gap-16">
          {LINES.map((line, i) => (
            <p
              key={line}
              data-manifesto-line
              className="font-display leading-[1.1] text-bone-100"
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.75rem)' }}
            >
              <span className="mr-4 align-top font-mono text-[11px] tracking-[0.3em] text-ember-500 uppercase">
                {String(i + 1).padStart(2, '0')}
              </span>
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
