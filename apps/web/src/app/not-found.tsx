/**
 * Custom 404. Matches the rest of the design language and gives the
 * user a useful next move (back to the configurator, or track-order).
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-ink-950 px-6 py-24 md:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[11px] tracking-[0.28em] text-ember-500 uppercase">
          404
        </p>
        <h1 className="display-headline mt-4 text-6xl md:text-8xl">
          Off the{' '}
          <span className="text-ember-500">deck.</span>
        </h1>
        <p className="caption mt-6 text-bone-50/70">
          That trick didn't land. The page you wanted is not here.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-ember-500 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-ink-950 uppercase transition-opacity hover:opacity-90"
          >
            ← back to top
          </Link>
          <Link
            href="/track-order"
            className="rounded-full border border-bone-50/15 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-bone-50 uppercase transition-colors hover:bg-white/5"
          >
            track an order
          </Link>
          <Link
            href="/faq"
            className="rounded-full border border-bone-50/15 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-bone-50 uppercase transition-colors hover:bg-white/5"
          >
            FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}
