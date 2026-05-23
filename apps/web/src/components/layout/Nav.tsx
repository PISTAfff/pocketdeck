'use client';

/**
 * Nav, fixed top navigation.
 *
 * Two visual states:
 *   - At the very top of the page: transparent, lets the hero breathe.
 *   - After 80px of scroll: translucent dark backdrop + blur so nav links stay
 *     readable as they pass over headlines, the deck, and bright sections.
 *
 * Anchor clicks route through Lenis's `scrollTo` for the same smooth feel as
 * native wheel scrolling, with an 80px top offset that clears the nav bar.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useSceneStore } from '@/store/scene';
import { scrollToHash } from '@/hooks/useLenis';

const links = [
  { href: '#manifesto', label: 'Manifesto' },
  { href: '#anatomy', label: 'Anatomy' },
  { href: '#configurator', label: 'Configure' },
  { href: '#tricks', label: 'Tricks' },
] as const;

function useScrolled(threshold = 80): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      data-cursor="link"
      onClick={(e) => {
        e.preventDefault();
        scrollToHash(href);
      }}
      className={clsx(
        'relative font-mono text-xs tracking-[0.24em] uppercase transition-opacity',
        active ? 'text-bone-50' : 'text-bone-50/70 hover:text-bone-50',
      )}
    >
      {label}
      {active && <span aria-hidden className="brush-underline" />}
    </a>
  );
}

export function Nav() {
  const activeSection = useSceneStore((s) => s.activeSection);
  const scrolled = useScrolled();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
      className={clsx(
        'fixed top-0 right-0 left-0 z-50 transition-colors duration-300',
        scrolled
          ? 'border-b border-bone-50/5 bg-ink-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/55'
          : 'bg-transparent',
      )}
    >
      <nav className="flex items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <a
          href="#hero"
          data-cursor="link"
          onClick={(e) => {
            e.preventDefault();
            scrollToHash('#hero');
          }}
          className="font-mono text-sm tracking-[0.32em] text-bone-50 uppercase"
        >
          pocket<span className="text-ember-500">·</span>deck
        </a>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <NavLink
                href={l.href}
                label={l.label}
                active={activeSection === l.href.slice(1)}
              />
            </li>
          ))}
        </ul>
        <MagneticButton
          href="#order"
          onClick={(e) => {
            e.preventDefault();
            scrollToHash('#order');
          }}
          innerClassName="rounded-full bg-ember-500 px-5 py-2 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400"
        >
          Buy
        </MagneticButton>
      </nav>
    </motion.header>
  );
}
