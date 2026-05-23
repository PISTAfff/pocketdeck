'use client';

/**
 * Hero, full-bleed section over the WebGL canvas. Headline reveals on mount
 * via SplitText; scroll cue at the bottom.
 *
 * Layout: copy occupies the left two thirds; the deck (rendered by the
 * persistent canvas) sits roughly center-right. Hero text NEVER overlaps the
 * deck because the deck's hero keyframe is centered at the origin and the
 * canvas wrapper transitions opacity in the second half of the page.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SplitText } from '@/components/ui/SplitText';
import { useSceneStore } from '@/store/scene';
import { scrollToHash } from '@/hooks/useLenis';

export function HeroSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.5) {
            setActiveSection('hero');
          }
        }
      },
      { threshold: [0.5] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [setActiveSection]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen flex-col justify-end px-6 pt-32 pb-28 sm:px-10 md:px-14 md:pb-32"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-mono text-[11px] tracking-[0.42em] text-bone-200 uppercase sm:text-xs"
        >
          96 mm · fingerboard · skate
        </motion.p>
        <h1
          className="mt-5 max-w-[18ch] font-display font-semibold leading-[0.92] tracking-[-0.03em] text-bone-50 sm:mt-6"
          style={{ fontSize: 'clamp(2.5rem, 9vw, 8rem)' }}
        >
          <SplitText by="word" stagger={0.08} delay={0.1}>
            A skatepark
          </SplitText>{' '}
          <SplitText
            by="word"
            stagger={0.08}
            delay={0.45}
            itemClassName="text-ember-500"
          >
            in your pocket.
          </SplitText>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="mt-6 max-w-md font-sans text-base leading-relaxed text-bone-200 sm:mt-8 sm:max-w-xl sm:text-lg"
        >
          PocketDeck is a precision-milled fingerboard built for the desk.
          Configurable down to the truck color. Ships in days.
        </motion.p>
      </div>

      <motion.a
        href="#manifesto"
        data-cursor="link"
        aria-label="Scroll to manifesto"
        onClick={(e) => {
          e.preventDefault();
          scrollToHash('#manifesto');
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute right-6 bottom-6 z-10 flex flex-col items-center gap-3 font-mono text-[10px] tracking-[0.4em] text-bone-300 uppercase sm:right-10 md:right-14"
      >
        <span>scroll</span>
        <motion.span
          aria-hidden
          className="block h-8 w-px bg-bone-300/60"
          animate={{ scaleY: [0.25, 1, 0.25], originY: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.a>
    </section>
  );
}
