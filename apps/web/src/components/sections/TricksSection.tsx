'use client';

/**
 * Tricks — grid of looping video tiles. Hovering a tile scrubs its
 * `currentTime` based on horizontal pointer position. Poster images stand in
 * for real trick clips — no real video files are committed at this stage.
 */
import { useEffect, useRef } from 'react';
import { useSceneStore } from '@/store/scene';
import { TrickTile } from './TrickTile';

const TRICKS = [
  { id: 'ollie', name: 'Ollie', description: 'The fundamental pop.' },
  { id: 'kickflip', name: 'Kickflip', description: 'Pop, flick, catch.' },
  { id: 'heelflip', name: 'Heelflip', description: 'Pop, flick the heel.' },
  { id: 'shuvit', name: 'Pop-Shuvit', description: '180° board rotation.' },
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
      className="relative px-6 py-40 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
            04 / tricks
          </p>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.02em] text-bone-50">
            What it can do.
          </h2>
          <p className="mt-6 max-w-xl font-sans text-base text-bone-200">
            Hover any tile and drag across to scrub the clip frame-by-frame.
          </p>
        </header>

        <div className="mt-20 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {TRICKS.map((trick, i) => (
            <TrickTile key={trick.id} {...trick} accent={i % 3 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
