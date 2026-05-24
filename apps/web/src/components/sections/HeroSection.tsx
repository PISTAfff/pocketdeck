'use client';

/**
 * Hero, entry shot.
 *
 * Layout (#9-#13):
 *   - Two badges inline above the headline ("96 MM" sticker-ember, "MADE ·
 *     CAIRO" sticker). The old "96 MM · FINGERBOARD · SKATE" tape pill is
 *     removed since it duplicated the same information.
 *   - Display headline two lines with an explicit 16 px gap between them.
 *   - Body paragraph at body leading.
 *   - CTA pair underneath: primary ember "CONFIGURE YOURS ->" + ghost "SEE
 *     THE BUILD" that smooth-scrolls to Anatomy.
 *   - Deck in the bottom-right via the hero keyframe (camera + world pos),
 *     never crossing the headline column.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SplitText } from '@/components/ui/SplitText';
import { useSceneStore } from '@/store/scene';
import { scrollToHash } from '@/hooks/useLenis';
import { StreetSprite } from '@/components/ui/StreetSprite';

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
      className="relative flex min-h-screen flex-col justify-end overflow-hidden px-6 pt-32 pb-24 sm:px-10 md:px-14 md:pb-24"
    >
      {/* Halftone field bleeding off the top-right corner */}
      <div
        aria-hidden
        className="halftone absolute top-12 right-[-4rem] h-[28rem] w-[28rem] rotate-12 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_50%,#000_0%,transparent_70%)]"
      />

      {/* Street-sprite scatter. Sits behind content (z-0) so they
          decorate the dead space without blocking reading. */}
      <StreetSprite
        kind="bolt"
        size={42}
        color="ember"
        rotate={-15}
        hover="pulse"
        className="absolute top-28 right-[10%] z-0"
      />
      <StreetSprite
        kind="star"
        size={28}
        color="bone"
        rotate={20}
        hover="spin"
        className="absolute top-[45%] right-[6%] z-0"
      />
      <StreetSprite
        kind="x"
        size={22}
        color="mute"
        rotate={12}
        hover="wiggle"
        className="absolute bottom-32 left-[55%] z-0 hidden md:inline-flex"
      />
      <StreetSprite
        kind="dots"
        size={56}
        color="ember"
        rotate={0}
        hover="none"
        className="absolute bottom-44 left-8 z-0 opacity-40 md:left-14"
      />
      <StreetSprite
        kind="spark"
        size={36}
        color="ember"
        rotate={0}
        hover="spin"
        className="absolute top-[8%] left-[45%] z-0 hidden md:inline-flex"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] gap-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-8">
        <div className="text-tint max-w-[640px]">
          {/* Inline badges (#13). No more dead absolute zone, badges live
              directly above the headline. */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { delay: 0.15, duration: 0.6 },
            }}
            className="mb-8 flex flex-wrap items-center gap-3"
          >
            <span className="sticker sticker-ember">96 mm</span>
            <span className="sticker">Made · Cairo</span>
          </motion.div>

          <h1
            className="display-headline text-bone-50"
            style={{
              fontSize: 'clamp(2.5rem, 6.2vw, 6.25rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.005em',
            }}
          >
            <span className="block">
              <SplitText by="word" stagger={0.08} delay={0.1}>
                A skatepark
              </SplitText>
            </span>
            {/* #12: explicit 16px gap between line 1 and line 2. */}
            <span className="mt-4 block">
              <SplitText
                by="word"
                stagger={0.08}
                delay={0.45}
                itemClassName="spray-text text-ember-500"
              >
                in your pocket.
              </SplitText>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.95 }}
            className="mt-8 max-w-md font-sans text-base text-bone-50 sm:text-lg"
            style={{ lineHeight: 'var(--leading-body)' }}
          >
            PocketDeck is a precision-milled fingerboard built for the desk.
            Configurable down to the truck color. Ships in days.
          </motion.p>

          {/* #11: explicit hero CTA pair. */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.15 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#configurator"
              data-cursor="link"
              onClick={(e) => {
                e.preventDefault();
                scrollToHash('#configurator');
              }}
              className="rounded-full bg-ember-500 px-8 py-4 font-mono text-xs font-medium tracking-[0.28em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_40px_-12px_rgba(255,91,20,0.5)] transition-colors hover:bg-ember-400"
            >
              Configure yours →
            </a>
            <a
              href="#anatomy"
              data-cursor="link"
              onClick={(e) => {
                e.preventDefault();
                scrollToHash('#anatomy');
              }}
              className="rounded-full border border-bone-50/25 px-8 py-4 font-mono text-xs tracking-[0.28em] text-bone-50 uppercase transition-colors hover:border-bone-50/60 hover:bg-bone-50/5"
            >
              See the build
            </a>
          </motion.div>
        </div>

        {/* Right column reserved for the deck. The hero keyframe places the
            deck in this column at the bottom (#10). */}
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
