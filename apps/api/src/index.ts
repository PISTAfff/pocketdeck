/**
 * API entry point.
 *
 * Boots the Express app, attempts the Mongo connection (failure is logged
 * and tolerated in dev), and starts the HTTP server.
 */
import { createApp } from './app.js';
import { connect } from './lib/db.js';
import { env } from './lib/env.js';
import { startSelfPing } from './lib/selfPing.js';

async function main(): Promise<void> {
  await connect();
  const app = createApp();
  app.listen(env.PORT, () => {
    process.stdout.write(`[api] listening on http://localhost:${env.PORT}\n`);
    // Render free tier spins down after idle; this keeps the dyno warm
    // by hitting our own /api/health URL every 14 min. No-op locally.
    startSelfPing();
  });
}

main().catch((err) => {
  console.error('[api] fatal startup error:', err);
  process.exit(1);
});
