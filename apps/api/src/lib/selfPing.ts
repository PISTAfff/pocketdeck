/**
 * Self-ping keep-warm loop.
 *
 * Render's free tier spins the dyno down after ~15 min with no inbound
 * HTTP traffic, and a cold wake-up takes ~30 s — enough to lose every
 * cold visitor's first page load. We work around it by having the API
 * fetch its own public health endpoint every 14 min. The outbound
 * request leaves the dyno and re-enters through Render's edge, which
 * Render counts as inbound traffic — the dyno stays warm.
 *
 * Activation is conditional on RENDER_EXTERNAL_URL being set, so the
 * loop is a no-op in local dev (where it would just be noise) and
 * automatically points at the right URL in production (Render injects
 * the var per service, so we don't have to hard-code the hostname).
 */
import { env } from './env.js';

const PING_INTERVAL_MS = 14 * 60 * 1000;
const PING_TIMEOUT_MS = 10_000;

export function startSelfPing(): void {
  const base = env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  if (!base) return;
  const url = `${base}/api/health`;

  const ping = async (): Promise<void> => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      process.stdout.write(`[self-ping] ${url} -> ${res.status}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[self-ping] failed: ${msg}\n`);
    }
  };

  // Skip the first immediate ping — the dyno is fresh, no warming
  // needed. Wait one interval, then ping every interval after.
  setInterval(() => {
    void ping();
  }, PING_INTERVAL_MS);
  process.stdout.write(
    `[self-ping] enabled, pinging ${url} every ${PING_INTERVAL_MS / 60_000} min\n`,
  );
}
