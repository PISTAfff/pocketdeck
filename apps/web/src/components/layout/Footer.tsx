'use client';

/**
 * Footer.
 *
 * Wave 8 changes:
 *   - Newsletter headline demoted from display to a ~28 px sub-display (#45)
 *   - Email input widened to the full column; the Subscribe pill button now
 *     sits INSIDE the input on the right (#46)
 *   - Pages column uses 32 px line-height and a 2 px ember underline on
 *     hover (#47)
 *   - All three columns share a single top baseline grid row (#48)
 *   - Fine-print row at 50 % opacity (#49)
 */
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiValidationError, createSubscriber } from '@/lib/api';
import { scrollToHash } from '@/hooks/useLenis';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

interface PagesLink {
  href: string;
  label: string;
  /** Hash links scroll-smooth on the home page; absolute routes navigate. */
  kind: 'hash' | 'route';
}

const PAGES: PagesLink[] = [
  { href: '#hero', label: 'Top', kind: 'hash' },
  { href: '#manifesto', label: 'Manifesto', kind: 'hash' },
  { href: '#anatomy', label: 'Anatomy', kind: 'hash' },
  { href: '#configurator', label: 'Configure', kind: 'hash' },
  { href: '#tricks', label: 'Tricks', kind: 'hash' },
  { href: '#order', label: 'Order', kind: 'hash' },
];

const SUPPORT: PagesLink[] = [
  { href: '/track-order', label: 'Track order', kind: 'route' },
  { href: '/faq', label: 'FAQ', kind: 'route' },
  { href: '/about', label: 'About', kind: 'route' },
  { href: '/admin', label: 'Admin', kind: 'route' },
];

const SOCIAL = [
  { href: 'https://instagram.com', label: 'Instagram' },
  { href: 'https://youtube.com', label: 'YouTube' },
  { href: 'https://tiktok.com', label: 'TikTok' },
];


export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const pathname = usePathname();
  const router = useRouter();
  // Section links only resolve on /. Off-home, route to /#section so the
  // browser scrolls to the matching id after the homepage mounts —
  // before this branch, footer hash links did nothing on /about, /faq, etc.
  const handleHashClick = (href: string) => {
    if (pathname === '/') {
      scrollToHash(href);
    } else {
      router.push(`/${href}`);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === 'submitting') return;
    setStatus({ kind: 'submitting' });
    try {
      await createSubscriber(email.trim().toLowerCase());
      setStatus({ kind: 'success' });
      setEmail('');
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const first = err.errors.find((e) => e.field === 'email');
        setStatus({ kind: 'error', message: first?.message ?? err.message });
      } else if (err instanceof Error) {
        setStatus({ kind: 'error', message: err.message });
      } else {
        setStatus({ kind: 'error', message: 'Subscription failed.' });
      }
    }
  };

  return (
    <footer className="relative z-10 border-t border-bone-50/10 bg-ink-950 px-6 pt-10 pb-6 sm:px-10 md:px-14">
      <div className="mx-auto max-w-[1400px]">
        {/* Top row: newsletter (left) + link columns (right) on desktop,
            stacked on mobile. Tighter rhythm than the original 3-column
            grid - the link lists collapse into compact inline groups. */}
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          {/* Newsletter, compact form */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
              Stay in the loop
            </p>
            <form
              onSubmit={onSubmit}
              className="mt-3 max-w-sm"
              noValidate
              aria-label="Newsletter signup"
            >
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@inbox.io"
                  aria-invalid={status.kind === 'error'}
                  aria-describedby="newsletter-msg"
                  className="h-11 w-full rounded-full bg-ink-900/60 pl-4 pr-28 font-mono text-xs text-bone-50 placeholder:text-bone-300/55 transition-colors border border-[rgba(255,255,255,0.12)] focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30 aria-invalid:border-red-500/70"
                />
                <button
                  type="submit"
                  data-cursor="link"
                  disabled={status.kind === 'submitting'}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-ember-500 px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-ink-950 uppercase transition-colors hover:bg-ember-400 disabled:opacity-60"
                >
                  {status.kind === 'submitting' ? '…' : 'Subscribe'}
                </button>
              </div>
              <p
                id="newsletter-msg"
                role="status"
                className="mt-2 min-h-4 font-mono text-[10px]"
              >
                {status.kind === 'success' && (
                  <span className="text-ember-400">Welcome aboard.</span>
                )}
                {status.kind === 'error' && (
                  <span className="text-red-400">{status.message}</span>
                )}
              </p>
            </form>
          </div>

          {/* Inline link columns: pages + support + social as compact rows */}
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-3 gap-x-8 gap-y-1 md:gap-x-10"
            style={{ rowGap: '4px' }}
          >
            <LinkColumn
              heading="Pages"
              links={PAGES}
              onHashClick={handleHashClick}
            />
            <LinkColumn heading="Support" links={SUPPORT} />
            <LinkColumn
              heading="Social"
              links={SOCIAL.map((s) => ({ ...s, kind: 'external' as const }))}
            />
          </nav>
        </div>

        {/* Fine-print divider row, tighter spacing. */}
        <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-bone-50/10 pt-4 text-[10px] opacity-60 md:flex-row md:items-center">
          <p className="font-mono tracking-[0.24em] text-bone-300 uppercase">
            PocketDeck · {new Date().getFullYear()} · Made in Cairo
          </p>
          <p className="font-mono tracking-[0.24em] text-bone-300 uppercase">
            v0.1 · 96 mm
          </p>
        </div>
      </div>
    </footer>
  );
}

interface FooterLink {
  href: string;
  label: string;
  kind?: 'hash' | 'route' | 'external';
}

function LinkColumn({
  heading,
  links,
  onHashClick,
}: {
  heading: string;
  links: FooterLink[];
  onHashClick?: (href: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300/70 uppercase">
        {heading}
      </p>
      <ul className="mt-2 space-y-0.5">
        {links.map((l) => {
          const isExternal = l.kind === 'external';
          const isHash = l.kind === 'hash';
          return (
            <li key={l.href}>
              <a
                href={l.href}
                data-cursor="link"
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
                onClick={
                  isHash && onHashClick
                    ? (e) => {
                        e.preventDefault();
                        onHashClick(l.href);
                      }
                    : undefined
                }
                className="group/link relative inline-block py-0.5 font-mono text-[11px] tracking-[0.04em] text-bone-200 transition-colors duration-300 ease-out hover:text-ember-400 focus-visible:text-ember-400 focus-visible:outline-none"
              >
                <span className="relative inline-flex items-baseline">
                  <span
                    aria-hidden
                    className="inline-block w-0 -translate-x-1 overflow-hidden text-ember-400 opacity-0 transition-all duration-300 ease-out group-hover/link:w-3 group-hover/link:translate-x-0 group-hover/link:opacity-100 group-focus-visible/link:w-3 group-focus-visible/link:translate-x-0 group-focus-visible/link:opacity-100"
                  >
                    {isExternal ? '↗' : '›'}
                  </span>
                  <span className="transition-transform duration-300 ease-out group-hover/link:[letter-spacing:0.08em] group-focus-visible/link:[letter-spacing:0.08em]">
                    {l.label}
                  </span>
                </span>
                {/* Primary ember underline sweeps in from the left … */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-ember-400 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100"
                />
                {/* … with a softer echo trailing in from the right. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-0.5 right-0 h-px w-full origin-right scale-x-0 bg-ember-400/30 transition-transform delay-100 duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
