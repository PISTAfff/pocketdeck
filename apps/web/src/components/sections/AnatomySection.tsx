'use client';

/**
 * Anatomy — labels for deck / trucks / wheels / bearings / grip reveal as you
 * scroll. Toggles `setExploded(true)` on enter and `setExploded(false)` on leave
 * so the WebGL scene shows the disassembled deck.
 */
import { useEffect, useRef } from 'react';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { useSceneStore } from '@/store/scene';

interface AnatomyPart {
  id: string;
  index: string;
  label: string;
  detail: string;
}

const PARTS: readonly AnatomyPart[] = [
  {
    id: 'deck',
    index: '01',
    label: 'Deck',
    detail: '7-ply Canadian maple. CNC nose & tail concaves.',
  },
  {
    id: 'trucks',
    index: '02',
    label: 'Trucks',
    detail: 'Cast aluminum. Hand-tuned bushings.',
  },
  {
    id: 'wheels',
    index: '03',
    label: 'Wheels',
    detail: 'Urethane 7.7 mm. Bearing-true rounds.',
  },
  {
    id: 'bearings',
    index: '04',
    label: 'Bearings',
    detail: 'Steel ABEC-7. Pre-lubed, sealed.',
  },
  {
    id: 'grip',
    index: '05',
    label: 'Grip',
    detail: 'Silicon carbide. Three textures.',
  },
];

export function AnatomySection() {
  const ScrollTrigger = useScrollTrigger();
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const setExploded = useSceneStore((s) => s.setExploded);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const labels = section.querySelectorAll<HTMLElement>('[data-anatomy-label]');
      gsap.set(labels, { '--reveal': 100 });

      labels.forEach((el) => {
        gsap.to(el, {
          '--reveal': 0,
          ease: 'power3.out',
          duration: 1.2,
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          setActiveSection('anatomy');
          setExploded(true);
        },
        onEnterBack: () => {
          setActiveSection('anatomy');
          setExploded(true);
        },
        onLeave: () => setExploded(false),
        onLeaveBack: () => setExploded(false),
      });
    }, section);

    return () => {
      ctx.revert();
      setExploded(false);
    };
  }, [ScrollTrigger, setActiveSection, setExploded]);

  return (
    <section
      ref={sectionRef}
      id="anatomy"
      className="relative px-6 py-40 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-24">
          <div className="md:sticky md:top-32 md:self-start">
            <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
              02 / anatomy
            </p>
            <h2 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.02em] text-bone-50">
              Five parts.
              <br />
              <span className="text-ember-500">One pocket.</span>
            </h2>
            <p className="mt-6 max-w-md font-sans text-base text-bone-200">
              Scroll to dismantle. Every component is treated like its full-scale
              counterpart — same shapes, same engineering, same parts vendors
              where we could find them.
            </p>
          </div>

          <ol className="flex flex-col">
            {PARTS.map((part) => (
              <li
                key={part.id}
                data-anatomy-label
                className="anatomy-label group border-b border-ink-700/60 py-10"
                style={
                  {
                    clipPath: 'inset(calc(var(--reveal) * 1%) 0 0 0)',
                  } as React.CSSProperties
                }
              >
                <div className="flex items-baseline justify-between gap-6">
                  <span className="font-mono text-xs tracking-[0.32em] text-ember-500 uppercase">
                    {part.index}
                  </span>
                  <h3 className="flex-1 font-display text-[clamp(2rem,4vw,3.25rem)] tracking-[-0.02em] text-bone-50">
                    {part.label}
                  </h3>
                </div>
                <p className="mt-4 max-w-md font-sans text-sm text-bone-300 md:ml-12">
                  {part.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
