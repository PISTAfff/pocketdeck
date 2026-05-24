'use client';

/**
 * Newsletter tab body.
 *
 * Three regions stacked on mobile, two columns on desktop:
 *   1. Subject + rich-text composer with a live preview pane.
 *   2. Subscribers list with per-row delete.
 *   3. Danger zone — full data reset behind a typed confirmation.
 *
 * Sending is currently a record-and-count operation server-side
 * (`POST /api/admin/newsletter`). The component talks to the server
 * the same way it would for a real provider, so wiring SMTP later is
 * a one-line change in the API route.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscriber } from '@pocketdeck/types';
import {
  ApiError,
  deleteSubscriber,
  listSubscribers,
  resetEverything,
  sendNewsletter,
  type ResetSummary,
} from '@/lib/api';
import { adminAuthHeader } from '@/lib/adminAuth';
import { RichTextEditor } from './RichTextEditor';
import { formatNumber } from './format';

interface Props {
  onResetComplete: () => void;
}

export function NewsletterPanel({ onResetComplete }: Props) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSummary, setResetSummary] = useState<ResetSummary | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await listSubscribers(adminAuthHeader());
      setSubscribers(rows);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load subscribers.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDeleteSubscriber = useCallback(
    async (id: string) => {
      try {
        await deleteSubscriber(id, adminAuthHeader());
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Delete failed.',
        );
      }
    },
    [],
  );

  const canSend =
    subject.trim().length >= 2 &&
    body.replace(/<[^>]+>/g, '').trim().length >= 2 &&
    !sending;

  const onSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setSentMessage(null);
    setError(null);
    try {
      const result = await sendNewsletter(
        { subject: subject.trim(), bodyHtml: body },
        adminAuthHeader(),
      );
      setSentMessage(
        `Queued for ${formatNumber(result.recipientCount)} subscriber${
          result.recipientCount === 1 ? '' : 's'
        }.`,
      );
      setSubject('');
      setBody('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }, [canSend, subject, body]);

  const onReset = useCallback(async () => {
    if (resetConfirm !== 'RESET') return;
    setResetting(true);
    setError(null);
    setResetSummary(null);
    try {
      const summary = await resetEverything(adminAuthHeader());
      setResetSummary(summary);
      setResetConfirm('');
      setSubscribers([]);
      onResetComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed.');
    } finally {
      setResetting(false);
    }
  }, [resetConfirm, onResetComplete]);

  const sortedSubs = useMemo(
    () =>
      [...subscribers].sort((a, b) => {
        const da = new Date(a.createdAt ?? 0).getTime();
        const db = new Date(b.createdAt ?? 0).getTime();
        return db - da;
      }),
    [subscribers],
  );

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Composer */}
        <section className="rounded-2xl border border-bone-50/10 bg-white/[0.02] p-5">
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.24em] text-bone-50/50 uppercase">
              Compose
            </p>
            <p className="font-mono text-[10px] tracking-[0.18em] text-bone-50/40 uppercase">
              {formatNumber(subscribers.length)} recipient
              {subscribers.length === 1 ? '' : 's'}
            </p>
          </header>

          <label
            htmlFor="newsletter-subject"
            className="block font-mono text-[10px] tracking-[0.22em] text-bone-50/60 uppercase"
          >
            Subject
          </label>
          <input
            id="newsletter-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new this drop?"
            maxLength={200}
            className="mt-2 w-full rounded-xl border border-bone-50/10 bg-white/[0.04] px-4 py-2.5 text-sm text-bone-50 placeholder:text-bone-50/30 focus:border-ember-500/40 focus:outline-none"
          />

          <div className="mt-4">
            <label className="block font-mono text-[10px] tracking-[0.22em] text-bone-50/60 uppercase">
              Body
            </label>
            <div className="mt-2">
              <RichTextEditor value={body} onChange={setBody} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="rounded-full bg-ember-500 px-5 py-2.5 font-mono text-[11px] tracking-[0.26em] text-ink-950 uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending
                ? 'Sending…'
                : `Send to ${formatNumber(subscribers.length)}`}
            </button>
            {sentMessage && (
              <p
                role="status"
                className="font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase"
              >
                {sentMessage}
              </p>
            )}
            <p className="ml-auto font-mono text-[10px] tracking-[0.18em] text-bone-50/30 uppercase">
              Provider: not wired (demo)
            </p>
          </div>

          {/* Live preview so the admin can sanity-check styling. */}
          <details className="mt-5 rounded-xl border border-bone-50/10 bg-white/[0.02] p-4 open:bg-white/[0.04]" open>
            <summary className="cursor-pointer font-mono text-[10px] tracking-[0.22em] text-bone-50/60 uppercase">
              Preview
            </summary>
            <div className="mt-4">
              <p className="font-mono text-[10px] tracking-[0.2em] text-bone-50/40 uppercase">
                Subject
              </p>
              <p className="mt-1 text-lg font-bold text-bone-50">
                {subject || <span className="text-bone-50/30">Untitled</span>}
              </p>
              <div className="mt-4 border-t border-bone-50/10 pt-4">
                {body.trim() ? (
                  <div
                    className="prose-newsletter text-bone-50/90"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                ) : (
                  <p className="font-sans text-sm text-bone-50/30">
                    The body preview shows up here as you type.
                  </p>
                )}
              </div>
            </div>
          </details>
        </section>

        {/* Subscribers list */}
        <section className="rounded-2xl border border-bone-50/10 bg-white/[0.02] p-5">
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.24em] text-bone-50/50 uppercase">
              Subscribers
            </p>
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="rounded-full border border-bone-50/15 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-bone-200 uppercase transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {busy ? '…' : 'Refresh'}
            </button>
          </header>
          {sortedSubs.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] tracking-[0.22em] text-bone-50/30 uppercase">
              {busy ? 'Loading…' : 'No subscribers yet'}
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {sortedSubs.map((s) => {
                const created = s.createdAt ? new Date(s.createdAt) : null;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-bone-50/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12px] text-bone-50">
                        {s.email}
                      </p>
                      {created && (
                        <p className="font-mono text-[10px] text-bone-50/40">
                          {created.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <SubscriberDelete
                      onConfirm={() => onDeleteSubscriber(s.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Danger zone */}
      <section className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.24em] text-rose-200 uppercase">
              Danger zone
            </p>
            <h3 className="mt-1 text-lg font-bold text-bone-50">
              Reset everything
            </h3>
            <p className="mt-1 max-w-xl font-sans text-sm text-bone-50/70">
              Wipes every order, subscriber, page view, and sent newsletter,
              then refills product stock to 100 per variant. There is no
              undo — back up first if it matters.
            </p>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            htmlFor="reset-confirm"
            className="font-mono text-[10px] tracking-[0.22em] text-bone-50/60 uppercase"
          >
            Type RESET
          </label>
          <input
            id="reset-confirm"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
            placeholder="RESET"
            className="rounded-xl border border-bone-50/15 bg-white/[0.04] px-3 py-2 font-mono text-sm tracking-wider text-bone-50 placeholder:text-bone-50/30 focus:border-rose-500/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={onReset}
            disabled={resetConfirm !== 'RESET' || resetting}
            className="rounded-full border border-rose-500/60 bg-rose-500/20 px-5 py-2 font-mono text-[11px] tracking-[0.22em] text-rose-100 uppercase transition-colors hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {resetting ? 'Wiping…' : 'Reset everything'}
          </button>
          {resetSummary && (
            <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
              Wiped · {resetSummary.orders} orders ·{' '}
              {resetSummary.subscribers} subs · {resetSummary.pageViews} views
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SubscriberDelete({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-md border border-rose-500/30 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-rose-300 uppercase transition-colors hover:bg-rose-500/10"
      >
        Delete
      </button>
    );
  }
  return (
    <span className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={async () => {
          setConfirming(false);
          await onConfirm();
        }}
        className="rounded-md border border-rose-500/50 bg-rose-500/15 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-rose-100 uppercase transition-colors hover:bg-rose-500/25"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md border border-bone-50/15 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-bone-200 uppercase transition-colors hover:bg-white/5"
      >
        Cancel
      </button>
    </span>
  );
}
