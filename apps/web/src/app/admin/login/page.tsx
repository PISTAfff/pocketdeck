'use client';

/**
 * /admin/login
 *
 * Single password field. On success the token is stored in localStorage
 * (adminAuth.ts) and the user is redirected to /admin. The server
 * returns a deliberately vague error on bad password so a leaked URL
 * doesn't leak password validity either.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { adminLogin } from '@/lib/adminAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminLogin(password);
      router.push('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed.');
      }
      setBusy(false);
    }
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-ink-950 px-6 py-24">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.28em] text-bone-50/60 uppercase hover:text-ember-500"
        >
          ← back to PocketDeck
        </Link>

        <div className="mt-10 rounded-2xl border border-bone-50/10 bg-white/[0.03] p-8 backdrop-blur">
          <p className="font-mono text-[10px] tracking-[0.32em] text-ember-500 uppercase">
            Operations
          </p>
          <h1 className="display-headline mt-3 text-4xl">
            Orders <span className="text-ember-500">desk.</span>
          </h1>
          <p className="mt-2 text-sm text-bone-50/60">
            Sign in with the shared admin password to view orders and stats.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[11px] tracking-[0.28em] text-bone-200 uppercase"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-bone-50/15 bg-white/5 px-4 py-3 font-mono text-sm tracking-wide text-bone-50 focus:border-ember-500 focus:outline-none"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-500"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || password.length === 0}
              className="w-full rounded-full bg-ember-500 px-6 py-3 font-mono text-[12px] tracking-[0.28em] text-ink-950 uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
