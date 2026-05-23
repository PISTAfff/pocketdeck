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
}

const PAGES: PagesLink[] = [
  { href: '#hero', label: 'Top' },
  { href: '#manifesto', label: 'Manifesto' },
  { href: '#anatomy', label: 'Anatomy' },
  { href: '#configurator', label: 'Configure' },
  { href: '#tricks', label: 'Tricks' },
  { href: '#order', label: 'Order' },
];

const SOCIAL = [
  { href: 'https://instagram.com', label: 'Instagram' },
  { href: 'https://youtube.com', label: 'YouTube' },
  { href: 'https://tiktok.com', label: 'TikTok' },
];

// Pages link: regular state, plus a brush-stroked underline reveal on hover (#47).
const linkClass =
  'relative inline-block font-mono text-sm text-bone-200 transition-colors hover:text-bone-50 ' +
  'after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-ember-500 after:transition-all after:duration-300 hover:after:w-full';

const linkLineHeight: React.CSSProperties = { lineHeight: '32px' };

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

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
    <footer className="relative z-10 border-t border-bone-50/10 bg-ink-950 px-6 pt-24 pb-10 sm:px-10 md:px-14">
      <div className="mx-auto grid max-w-[1400px] items-start gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
        {/* Newsletter column */}
        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Stay in the loop
          </p>
          <h3
            className="mt-3 max-w-md font-sans font-medium text-bone-50"
            style={{
              // #45: sub-headline scale, ~28 px on desktop.
              fontSize: 'clamp(1.25rem, 1.8vw, 1.75rem)',
              lineHeight: 'var(--leading-sub-display)',
              letterSpacing: '-0.005em',
            }}
          >
            Drops, restocks, and the occasional trick clip.
          </h3>

          {/* #46: wide email field with Subscribe pill INSIDE on the right. */}
          <form
            onSubmit={onSubmit}
            className="mt-6 max-w-md"
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
                className="h-14 w-full rounded-full bg-ink-900/60 pl-5 pr-32 font-mono text-sm text-bone-50 placeholder:text-bone-300/55 transition-colors border border-[rgba(255,255,255,0.12)] focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30 aria-invalid:border-red-500/70"
              />
              <button
                type="submit"
                data-cursor="link"
                disabled={status.kind === 'submitting'}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full bg-ember-500 px-5 py-2.5 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400 disabled:opacity-60"
              >
                {status.kind === 'submitting' ? 'Sending' : 'Subscribe'}
              </button>
            </div>
            <p
              id="newsletter-msg"
              role="status"
              className="mt-3 min-h-5 font-mono text-xs"
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

        {/* Pages column */}
        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Pages
          </p>
          <ul className="mt-4 space-y-1">
            {PAGES.map((l) => (
              <li key={l.href} style={linkLineHeight}>
                <a
                  href={l.href}
                  data-cursor="link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHash(l.href);
                  }}
                  className={linkClass}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Social column */}
        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Social
          </p>
          <ul className="mt-4 space-y-1">
            {SOCIAL.map((s) => (
              <li key={s.href} style={linkLineHeight}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="link"
                  className={linkClass}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fine-print at 50% opacity (#49) */}
      <div className="mx-auto mt-20 flex max-w-[1400px] flex-col items-start justify-between gap-3 border-t border-bone-50/10 pt-6 opacity-50 md:flex-row md:items-center">
        <p className="font-mono text-[11px] tracking-[0.24em] text-bone-300 uppercase">
          PocketDeck · {new Date().getFullYear()} · Made in Cairo
        </p>
        <p className="font-mono text-[11px] tracking-[0.24em] text-bone-300 uppercase">
          v0.1 · 96 mm
        </p>
      </div>
    </footer>
  );
}
