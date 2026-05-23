'use client';

/**
 * Tricks, grid of looping video tiles. Each tile gets a chunky street label,
 * a sticker-numbered corner, and a per-trick motion glyph in the background.
 *
 * Sits on an opaque ink-950 background; the canvas has faded by this scroll
 * position anyway.
 */
import { useEffect, useRef } from 'react';
import { useSceneStore } from '@/store/scene';
import { TrickTile } from './TrickTile';

interface TrickDef {
  id: string;
  name: string;
  description: string;
}

const TRICKS: readonly TrickDef[] = [
  { id: 'ollie', name: 'Ollie', description: 'The fundamental pop.' },
  { id: 'kickflip', name: 'Kickflip', description: 'Pop, flick, catch.' },
  { id: 'heelflip', name: 'Heelflip', description: 'Pop, flick the heel.' },
  { id: 'shuvit', name: 'Pop-Shuvit', description: '180-degree board rotation.' },
  { id: 'manual', name: 'Manual', description: 'Balance on two wheels.' },
  { id: 'grind', name: '50-50 Grind', description: 'Both trucks, lock in.' },
];

export function TricksSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.3) {
            setActiveSection('tricks');
          }
        }
      },
      { threshold: [0.3] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [setActiveSection]);

  return (
    <section
      ref={sectionRef}
      id="tricks"
      // #32: top padding halved so the heading sits closer to the grid.
      className="relative bg-ink-950 px-6 pt-16 pb-24 sm:px-10 md:px-14 md:pt-20 md:pb-24"
    >
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-col items-start gap-4">
          <span className="tape inline-block">04 · tricks</span>
          <h2
            className="display-headline text-bone-50"
            style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5.5rem)' }}
          >
            What it can <span className="spray-text text-ember-500">do</span>.
          </h2>
          <p className="max-w-xl font-sans text-base leading-relaxed text-bone-100">
            Hover any tile and drag horizontally to scrub the clip
            frame-by-frame. Drag right to fast-forward, left to rewind.
          </p>
        </header>

        <div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-12"
          style={{ gridAutoRows: '1fr' }}
        >
          {TRICKS.map((trick, i) => (
            <TrickTile key={trick.id} number={i + 1} {...trick} />
          ))}
        </div>
      </div>
    </section>
  );
}
