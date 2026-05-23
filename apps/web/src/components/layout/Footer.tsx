'use client';

/**
 * Footer, credits row, socials, and newsletter signup wired to
 * POST /api/subscribers.
 *
 * Sits on an opaque ink-950 background with a soft top border so it cleanly
 * separates from the Order section above. Subscribe input and button are
 * matched in height (h-12).
 */
import { useState } from 'react';
import { ApiValidationError, createSubscriber } from '@/lib/api';
import { scrollToHash } from '@/hooks/useLenis';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

const linkClass = 'transition-colors hover:text-bone-50';

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

  const internalLinks: { href: string; label: string }[] = [
    { href: '#hero', label: 'Top' },
    { href: '#manifesto', label: 'Manifesto' },
    { href: '#anatomy', label: 'Anatomy' },
    { href: '#configurator', label: 'Configurator' },
    { href: '#order', label: 'Order' },
  ];

  return (
    <footer className="relative z-10 border-t border-bone-50/10 bg-ink-950 px-6 pt-20 pb-10 sm:px-10 md:px-14">
      <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Stay in the loop
          </p>
          <h3
            className="mt-3 max-w-md font-display font-semibold leading-[1.05] tracking-[-0.01em] text-bone-50"
            style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)' }}
          >
            Drops, restocks, and the occasional trick clip.
          </h3>
          <form
            onSubmit={onSubmit}
            className="mt-6 flex max-w-md flex-col gap-2 sm:flex-row sm:gap-3"
            noValidate
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@inbox.io"
              aria-invalid={status.kind === 'error'}
              aria-describedby="newsletter-msg"
              className="h-12 flex-1 rounded-full border border-bone-50/15 bg-transparent px-5 font-mono text-sm text-bone-50 placeholder:text-bone-300/60 transition-colors focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30 aria-invalid:border-red-500/70"
            />
            <button
              type="submit"
              data-cursor="link"
              disabled={status.kind === 'submitting'}
              className="h-12 rounded-full bg-ember-500 px-6 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400 disabled:opacity-60"
            >
              {status.kind === 'submitting' ? 'Sending...' : 'Subscribe'}
            </button>
          </form>
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
        </div>

        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Pages
          </p>
          <ul className="mt-4 space-y-2 font-mono text-sm text-bone-200">
            {internalLinks.map((l) => (
              <li key={l.href}>
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

        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Social
          </p>
          <ul className="mt-4 space-y-2 font-mono text-sm text-bone-200">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                data-cursor="link"
                className={linkClass}
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                data-cursor="link"
                className={linkClass}
              >
                YouTube
              </a>
            </li>
            <li>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                data-cursor="link"
                className={linkClass}
              >
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1400px] flex-col items-start justify-between gap-3 border-t border-bone-50/10 pt-6 md:flex-row md:items-center">
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
