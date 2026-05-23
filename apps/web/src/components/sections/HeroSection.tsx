'use client';

/**
 * Hero, the entry shot. Anton condensed display headline, a kicker label
 * stamped on a sticker, and a tape strip carrying the size callout.
 *
 * Copy occupies the lower two thirds of the screen; the deck (in its hero
 * keyframe) sits slightly to the right at compact scale.
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
      className="relative flex min-h-screen flex-col justify-end overflow-hidden px-6 pt-32 pb-28 sm:px-10 md:px-14 md:pb-32"
    >
      {/* Halftone field bleeding off the top-right corner */}
      <div
        aria-hidden
        className="halftone absolute top-12 right-[-4rem] h-[28rem] w-[28rem] rotate-12 opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_50%,#000_0%,transparent_70%)]"
      />

      {/* Stamped badges in the top-left, behind the nav line */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { delay: 1.5, duration: 0.7 } }}
        className="absolute top-32 left-6 hidden gap-3 sm:left-10 md:left-14 lg:flex"
      >
        <span className="sticker sticker-ember">96 mm</span>
        <span className="sticker rotate-[2deg]">Made · Cairo</span>
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="tape"
        >
          96 mm · fingerboard · skate
        </motion.div>

        <h1
          className="display-headline mt-6 max-w-[14ch] text-bone-50"
          style={{ fontSize: 'clamp(3.5rem, 13vw, 11rem)' }}
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
          className="mt-7 max-w-md font-sans text-base leading-relaxed text-bone-100 sm:mt-8 sm:max-w-xl sm:text-lg"
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
        className="absolute right-6 bottom-6 z-10 flex flex-col items-center gap-3 font-mono text-[10px] tracking-[0.4em] text-bone-200 uppercase sm:right-10 md:right-14"
      >
        <span>scroll</span>
        <motion.span
          aria-hidden
          className="block h-10 w-px bg-ember-500/80"
          animate={{ scaleY: [0.25, 1, 0.25], originY: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.a>
    </section>
  );
}
