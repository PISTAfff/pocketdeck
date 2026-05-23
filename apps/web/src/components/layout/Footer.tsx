'use client';

/**
 * Footer — credits row, socials, and newsletter signup wired to
 * POST /api/subscribers. Mounted by ChromeRoot so it sits below page content.
 */
import { useState } from 'react';
import { ApiValidationError, createSubscriber } from '@/lib/api';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

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
        setStatus({
          kind: 'error',
          message: first?.message ?? err.message,
        });
      } else if (err instanceof Error) {
        setStatus({ kind: 'error', message: err.message });
      } else {
        setStatus({ kind: 'error', message: 'Subscription failed.' });
      }
    }
  };

  return (
    <footer className="relative z-10 border-t border-ink-700/60 bg-ink-950/80 px-6 pt-20 pb-10 backdrop-blur-md md:px-10">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
            Stay in the loop
          </p>
          <h3 className="mt-3 max-w-md font-display text-3xl text-bone-50 md:text-4xl">
            Drops, restocks, and the occasional trick clip.
          </h3>
          <form onSubmit={onSubmit} className="mt-6 flex max-w-md gap-2" noValidate>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@inbox.io"
              aria-invalid={status.kind === 'error'}
              aria-describedby="newsletter-msg"
              className="flex-1 rounded-full border border-bone-300/30 bg-transparent px-5 py-3 font-mono text-sm text-bone-50 placeholder:text-bone-300/60 focus:border-ember-500 focus:outline-none"
            />
            <button
              type="submit"
              data-cursor="link"
              disabled={status.kind === 'submitting'}
              className="rounded-full bg-ember-500 px-5 py-3 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400 disabled:opacity-60"
            >
              {status.kind === 'submitting' ? 'Sending…' : 'Subscribe'}
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
            Links
          </p>
          <ul className="mt-4 space-y-2 font-mono text-sm text-bone-200">
            <li>
              <a href="#hero" data-cursor="link" className="hover:text-bone-50">
                Top
              </a>
            </li>
            <li>
              <a href="#anatomy" data-cursor="link" className="hover:text-bone-50">
                Anatomy
              </a>
            </li>
            <li>
              <a
                href="#configurator"
                data-cursor="link"
                className="hover:text-bone-50"
              >
                Configurator
              </a>
            </li>
            <li>
              <a href="#order" data-cursor="link" className="hover:text-bone-50">
                Order
              </a>
            </li>
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
                className="hover:text-bone-50"
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
                className="hover:text-bone-50"
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
                className="hover:text-bone-50"
              >
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col items-start justify-between gap-3 border-t border-ink-700/60 pt-6 md:flex-row md:items-center">
        <p className="font-mono text-xs tracking-[0.24em] text-bone-300 uppercase">
          PocketDeck · {new Date().getFullYear()} · Made in Cairo
        </p>
        <p className="font-mono text-xs tracking-[0.24em] text-bone-300 uppercase">
          v0.1 · 96 mm
        </p>
      </div>
    </footer>
  );
}
