'use client';

/**
 * Hero — full-bleed section over the WebGL canvas. Headline reveals on mount
 * via SplitText; subtle scroll cue at the bottom.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SplitText } from '@/components/ui/SplitText';
import { useSceneStore } from '@/store/scene';

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
      className="relative flex min-h-screen items-end px-6 pt-32 pb-24 md:px-12 md:pb-32"
    >
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase"
        >
          96 mm · fingerboard · skate
        </motion.p>
        <h1 className="mt-6 font-display text-[clamp(3.25rem,12vw,11rem)] leading-[0.92] tracking-[-0.03em] text-bone-50">
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
          className="mt-8 max-w-xl font-sans text-base text-bone-200 md:text-lg"
        >
          PocketDeck is a precision-milled fingerboard built for the desk —
          configurable down to the truck color, shipped in days.
        </motion.p>
      </div>

      <motion.a
        href="#manifesto"
        data-cursor="link"
        aria-label="Scroll to manifesto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 font-mono text-[10px] tracking-[0.4em] text-bone-300 uppercase"
      >
        <span>scroll</span>
        <motion.span
          aria-hidden
          className="mx-auto mt-3 block h-10 w-px bg-bone-300"
          animate={{ scaleY: [0.2, 1, 0.2], originY: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.a>
    </section>
  );
}
