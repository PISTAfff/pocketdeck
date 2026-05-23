'use client';

/**
 * Anatomy, parts list reveals as you scroll. Toggles exploded view in the
 * scene store on enter / leave.
 *
 * Layout swapped vs. Phase 2: the parts list is now on the LEFT and the
 * heading column on the RIGHT, so the deck (positioned to the right of origin
 * in the anatomy keyframe) doesn't sit on top of the list text.
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
    detail: '7-ply Canadian maple with CNC nose and tail concaves.',
  },
  {
    id: 'trucks',
    index: '02',
    label: 'Trucks',
    detail: 'Cast aluminum hangers, hand-tuned bushings.',
  },
  {
    id: 'wheels',
    index: '03',
    label: 'Wheels',
    detail: 'Urethane 7.7 mm with bearing-true rounds.',
  },
  {
    id: 'bearings',
    index: '04',
    label: 'Bearings',
    detail: 'Steel ABEC-7, pre-lubed, sealed.',
  },
  {
    id: 'grip',
    index: '05',
    label: 'Grip',
    detail: 'Silicon carbide in three textures.',
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
      gsap.set(labels, { autoAlpha: 0, y: 24 });

      labels.forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1,
          y: 0,
          ease: 'power3.out',
          duration: 0.9,
          delay: i * 0.04,
          scrollTrigger: {
            trigger: el,
            start: 'top 82%',
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
      className="relative px-6 py-32 sm:px-10 md:px-14 md:py-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-20">
          {/* Parts list on the LEFT so the deck (rendered to the right of origin) sits in its own column */}
          <ol className="flex flex-col">
            {PARTS.map((part) => (
              <li
                key={part.id}
                data-anatomy-label
                className="group border-b border-bone-50/10 py-8 last:border-b-0 md:py-10"
              >
                <div className="flex items-baseline gap-6 md:gap-8">
                  <span className="font-mono text-sm tracking-[0.32em] text-ember-500 uppercase tabular-nums">
                    {part.index}
                  </span>
                  <h3
                    className="flex-1 font-display font-semibold tracking-[-0.02em] text-bone-50"
                    style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
                  >
                    {part.label}
                  </h3>
                </div>
                <p className="mt-3 max-w-md font-sans text-sm text-bone-200 md:ml-[3.25rem] md:text-base">
                  {part.detail}
                </p>
              </li>
            ))}
          </ol>

          {/* Heading column on the right, sticky on desktop */}
          <div className="md:sticky md:top-28 md:self-start md:pt-8">
            <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
              02 / anatomy
            </p>
            <h2
              className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
            >
              Five parts.
              <br />
              <span className="text-ember-500">One pocket.</span>
            </h2>
            <p className="mt-6 max-w-md font-sans text-base leading-relaxed text-bone-200">
              Scroll to dismantle. Every component is treated like its
              full-scale counterpart: same shapes, same engineering, same parts
              vendors where we could find them.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
