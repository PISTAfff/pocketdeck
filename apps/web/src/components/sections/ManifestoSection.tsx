'use client';

/**
 * Manifesto — scroll-pinned text. As you scroll through the section, the
 * headline stays pinned while the body lines tick through. Calls
 * `setActiveSection('manifesto')` while in view.
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

    const ctx = gsap.context(() => {
      const lineEls = lines.querySelectorAll<HTMLElement>('[data-manifesto-line]');
      gsap.set(lineEls, { autoAlpha: 0, y: 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          pin: headline,
          pinSpacing: false,
          scrub: 0.6,
          onEnter: () => setActiveSection('manifesto'),
          onEnterBack: () => setActiveSection('manifesto'),
        },
      });

      lineEls.forEach((el, i) => {
        tl.to(el, { autoAlpha: 1, y: 0, duration: 1 }, i * 0.6);
        if (i < lineEls.length - 1) {
          tl.to(el, { autoAlpha: 0.18, duration: 0.6 }, i * 0.6 + 0.7);
        }
      });
    }, section);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [ScrollTrigger, setActiveSection]);

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      className="relative px-6 py-40 md:px-12"
    >
      <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[1fr_1.4fr] md:gap-24">
        <div ref={headlineRef} className="h-[60vh]">
          <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
            01 / manifesto
          </p>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.02em] text-bone-50">
            Built to fidget,
            <br />
            tuned to <span className="text-ember-500">ride</span>.
          </h2>
        </div>
        <div ref={linesRef} className="flex flex-col gap-12 pt-4 md:gap-20">
          {LINES.map((line, i) => (
            <p
              key={line}
              data-manifesto-line
              className="font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] text-bone-100"
            >
              <span className="mr-4 font-mono text-xs tracking-[0.3em] text-ember-500 uppercase align-top">
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
