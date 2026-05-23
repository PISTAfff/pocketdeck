'use client';

/**
 * Tricks, grid of looping video tiles. Hovering a tile scrubs its
 * `currentTime` based on horizontal pointer position. Tile heights are fixed
 * by an aspect ratio so the 3-column grid stays perfectly aligned.
 *
 * Sits over an opaque section background so the canvas (which has faded out
 * by this scroll position anyway) never interferes with the grid.
 */
import { useEffect, useRef } from 'react';
import { useSceneStore } from '@/store/scene';
import { TrickTile } from './TrickTile';

const TRICKS = [
  { id: 'ollie', name: 'Ollie', description: 'The fundamental pop.' },
  { id: 'kickflip', name: 'Kickflip', description: 'Pop, flick, catch.' },
  { id: 'heelflip', name: 'Heelflip', description: 'Pop, flick the heel.' },
  { id: 'shuvit', name: 'Pop-Shuvit', description: '180-degree board rotation.' },
  { id: 'manual', name: 'Manual', description: 'Balance on two wheels.' },
  { id: 'grind', name: '50-50 Grind', description: 'Both trucks, lock in.' },
] as const;

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
      className="relative bg-ink-950 px-6 py-28 sm:px-10 md:px-14 md:py-36"
    >
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-col items-start gap-4 md:items-center md:text-center">
          <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
            04 / tricks
          </p>
          <h2
            className="font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            What it can do.
          </h2>
          <p className="max-w-xl font-sans text-base leading-relaxed text-bone-200">
            Hover any tile and drag horizontally to scrub the clip
            frame-by-frame. Drag right to fast-forward, left to rewind.
          </p>
        </header>

        <div
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-20"
          style={{ gridAutoRows: '1fr' }}
        >
          {TRICKS.map((trick) => (
            <TrickTile key={trick.id} {...trick} />
          ))}
        </div>
      </div>
    </section>
  );
}
