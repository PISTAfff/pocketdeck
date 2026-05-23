'use client';

/**
 * Nav — fixed top navigation with mix-blend-difference styling so it remains
 * legible over both the WebGL canvas and DOM sections.
 */
import { motion } from 'framer-motion';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useSceneStore } from '@/store/scene';

const links = [
  { href: '#manifesto', label: 'Manifesto' },
  { href: '#anatomy', label: 'Anatomy' },
  { href: '#configurator', label: 'Configure' },
  { href: '#tricks', label: 'Tricks' },
] as const;

export function Nav() {
  const activeSection = useSceneStore((s) => s.activeSection);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
      className="fixed top-0 right-0 left-0 z-50 mix-blend-difference"
    >
      <nav className="flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
        <a
          href="#hero"
          data-cursor="link"
          className="font-mono text-sm tracking-[0.32em] text-bone-50 uppercase"
        >
          pocket<span className="text-ember-500">·</span>deck
        </a>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-cursor="link"
                className="font-mono text-xs tracking-[0.24em] text-bone-50 uppercase transition-opacity hover:opacity-60"
                data-active={activeSection === l.href.slice(1)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <MagneticButton
          href="#order"
          innerClassName="rounded-full border border-bone-50 px-5 py-2 font-mono text-xs tracking-[0.24em] text-bone-50 uppercase transition-colors hover:bg-bone-50 hover:text-ink-950"
        >
          Buy
        </MagneticButton>
      </nav>
    </motion.header>
  );
}
