'use client';

/**
 * Manifesto, scroll-pinned declaration that builds line by line.
 *
 * The whole section pins for 4 viewports of scroll (one per line) so the
 * headline and the lines column stay in the viewport while the user scrolls.
 * Each line reveals as the user crosses a snap point and dims slightly when
 * the next line takes the spotlight, building toward the final "Just bearings,
 * maple, and inertia." moment.
 *
 * Snap behaviour: 5 snap positions = 4 transitions. The user can't lose track
 * of which line they're on because each scroll lands cleanly.
 *
 * Mobile: drop the pin entirely and let the lines stack vertically with a
 * batch fade-in, no scroll-jacking on small screens.
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

const VIEWPORTS_PER_LINE = 1; // one viewport of scroll per line transition

export function ManifestoSection() {
  const ScrollTrigger = useScrollTrigger();
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const sectionRef = useRef<HTMLElement | null>(null);
  const linesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const lines = linesRef.current;
    if (!section || !lines) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const ctx = gsap.context(() => {
        const lineEls = lines.querySelectorAll<HTMLElement>('[data-manifesto-line]');
        gsap.set(lineEls, { autoAlpha: 0, y: 60 });

        const totalScrollPct = LINES.length * VIEWPORTS_PER_LINE * 100;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: `+=${totalScrollPct}%`,
            pin: section,
            pinSpacing: true,
            scrub: 0.6,
            snap: {
              snapTo: 1 / LINES.length,
              duration: { min: 0.2, max: 0.45 },
              ease: 'power2.inOut',
            },
            onEnter: () => setActiveSection('manifesto'),
            onEnterBack: () => setActiveSection('manifesto'),
          },
        });

        // Each line reveals one unit later than the previous, and dims a bit
        // when the next line takes the focus. Last line stays at full strength.
        lineEls.forEach((el, i) => {
          tl.to(
            el,
            {
              autoAlpha: 1,
              y: 0,
              ease: 'power3.out',
              duration: 0.55,
            },
            i,
          );
          if (i < lineEls.length - 1) {
            tl.to(
              el,
              { autoAlpha: 0.32, duration: 0.45, ease: 'power1.out' },
              i + 0.7,
            );
          }
        });
      }, section);

      return () => ctx.revert();
    });

    mm.add('(max-width: 767px)', () => {
      const ctx = gsap.context(() => {
        const lineEls = lines.querySelectorAll<HTMLElement>('[data-manifesto-line]');
        gsap.set(lineEls, { autoAlpha: 0, y: 24 });
        ScrollTrigger.batch(lineEls, {
          start: 'top 82%',
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
      className="relative flex min-h-screen items-center px-6 py-24 sm:px-10 md:px-14"
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 md:grid-cols-[1fr_1.4fr] md:gap-20">
        <div>
          <span className="tape inline-block">01 · manifesto</span>
          <h2
            className="display-headline mt-6 text-bone-50"
            style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5.5rem)' }}
          >
            Built to fidget,
            <br />
            tuned to <span className="text-ember-500">ride</span>.
          </h2>
          <p className="mt-8 hidden max-w-sm font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase md:block">
            Scroll · four declarations
          </p>
        </div>
        <div ref={linesRef} className="flex flex-col gap-10 md:gap-16">
          {LINES.map((line, i) => (
            <p
              key={line}
              data-manifesto-line
              className="display-headline leading-[1] text-bone-50"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 3.5rem)' }}
            >
              <span className="mr-4 align-top font-mono text-[11px] tracking-[0.3em] text-ember-500 normal-case">
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
