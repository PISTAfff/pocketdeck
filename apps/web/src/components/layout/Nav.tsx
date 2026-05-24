'use client';

/**
 * Nav, fixed top navigation.
 *
 * Two visual states:
 *   - At the very top of the page: transparent, lets the hero breathe.
 *   - After 80px of scroll: translucent dark backdrop + blur so nav links stay
 *     readable as they pass over headlines, the deck, and bright sections.
 *
 * Link behavior depends on the current route:
 *   - On the home page, anchor clicks call Lenis's smooth `scrollTo` for the
 *     same feel as native wheel scrolling.
 *   - On any other page (/about, /faq, /track-order…), the section anchors
 *     don't exist locally — we navigate to `/#section` via the router, and
 *     the browser scrolls to the matching id after the home page mounts.
 *     Without this branch the nav looked broken everywhere off-home (the
 *     handler called `scrollToHash` on an id that wasn't in the DOM).
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useSceneStore } from '@/store/scene';
import { scrollToHash } from '@/hooks/useLenis';

const links = [
  { href: '#manifesto', label: 'Manifesto' },
  { href: '#anatomy', label: 'Anatomy' },
  { href: '#tricks', label: 'Tricks' },
  { href: '#configurator', label: 'Configure' },
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

/**
 * Build the right href + click handler for an in-page section anchor.
 * On home, prevent default and Lenis-scroll. Off home, hand off to Next's
 * router so the browser does a full page navigation to "/#section".
 */
function useSectionLink(hash: string) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';

  const href = isHome ? hash : `/${hash}`;
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isHome) {
      scrollToHash(hash);
    } else {
      router.push(`/${hash}`);
    }
  };
  return { href, onClick };
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const link = useSectionLink(href);
  return (
    <a
      href={link.href}
      data-cursor="link"
      onClick={link.onClick}
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
  const logoLink = useSectionLink('#hero');
  const buyLink = useSectionLink('#order');

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
          href={logoLink.href}
          data-cursor="link"
          onClick={logoLink.onClick}
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
          href={buyLink.href}
          onClick={buyLink.onClick}
          innerClassName="rounded-full bg-ember-500 px-5 py-2 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400"
        >
          Buy
        </MagneticButton>
      </nav>
    </motion.header>
  );
}
