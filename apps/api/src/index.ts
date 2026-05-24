/**
 * API entry point.
 *
 * Boots the Express app, validates production env vars, attempts the Mongo
 * connection (failure is logged and tolerated in dev), and starts the HTTP
 * server. Production refuses to boot if security-sensitive env vars are
 * missing — see `assertProductionEnv()`.
 */
import { createApp } from './app.js';
import { connect, disconnect } from './lib/db.js';
import { assertProductionEnv, env } from './lib/env.js';
import { startSelfPing, stopSelfPing } from './lib/selfPing.js';

async function main(): Promise<void> {
  assertProductionEnv();
  await connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    process.stdout.write(`[api] listening on http://localhost:${env.PORT}\n`);
    // Render free tier spins down after idle; this keeps the dyno warm
    // by hitting our own /api/health URL every 14 min. No-op locally.
    startSelfPing();
  });

  // Graceful shutdown — drain in-flight requests, stop the keep-warm
  // loop, close the Mongo connection. Render sends SIGTERM with a 30s
  // grace period; SIGINT is what you get when running locally and
  // hitting ctrl-C.
  const shutdown = async (signal: string): Promise<void> => {
    process.stdout.write(`[api] received ${signal}, shutting down\n`);
    stopSelfPing();
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
    // Force-exit if connections don't drain in 10s.
    setTimeout(() => {
      process.stderr.write('[api] shutdown timeout, forcing exit\n');
      process.exit(1);
    }, 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[api] fatal startup error:', err);
  process.exit(1);
});
