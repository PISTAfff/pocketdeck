'use client';

/**
 * Hero, entry shot. Two-column layout on desktop: copy on the left, the
 * persistent 3D deck reserved column on the right. The text never overlaps
 * the deck because both occupy disjoint columns.
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
      className="relative flex min-h-screen flex-col justify-end overflow-hidden px-6 pt-32 pb-24 sm:px-10 md:px-14 md:pb-32"
    >
      {/* Halftone field bleeding off the top-right corner */}
      <div
        aria-hidden
        className="halftone absolute top-12 right-[-4rem] h-[28rem] w-[28rem] rotate-12 opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_50%,#000_0%,transparent_70%)]"
      />

      {/* Stamped badges in the top-left, below the nav */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { delay: 1.5, duration: 0.7 } }}
        className="absolute top-32 left-6 hidden gap-3 sm:left-10 md:left-14 lg:flex"
      >
        <span className="sticker sticker-ember">96 mm</span>
        <span className="sticker rotate-[2deg]">Made · Cairo</span>
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] gap-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-8">
        <div className="max-w-[640px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="tape"
          >
            96 mm · fingerboard · skate
          </motion.div>

          <h1
            className="display-headline mt-7 text-bone-50"
            style={{
              fontSize: 'clamp(2.5rem, 6.2vw, 6.25rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.005em',
            }}
          >
            <SplitText by="word" stagger={0.08} delay={0.1}>
              A skatepark
            </SplitText>
            <br />
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
            className="mt-7 max-w-md font-sans text-base leading-relaxed text-bone-100 sm:text-lg"
          >
            PocketDeck is a precision-milled fingerboard built for the desk.
            Configurable down to the truck color. Ships in days.
          </motion.p>
        </div>

        {/*
          Empty column on the right reserved for the deck. The persistent
          canvas renders the deck in this region via the hero keyframe
          (deck position +X, slightly above the baseline). Kept as an empty
          aria-hidden block so the grid keeps the gap.
        */}
        <div aria-hidden className="hidden h-[420px] md:block" />
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
