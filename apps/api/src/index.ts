/**
 * API entry point.
 *
 * Boots the Express app, attempts the Mongo connection (failure is logged
 * and tolerated in dev), and starts the HTTP server.
 */
import { createApp } from './app.js';
import { connect } from './lib/db.js';
import { env } from './lib/env.js';

async function main(): Promise<void> {
  await connect();
  const app = createApp();
  app.listen(env.PORT, () => {
    process.stdout.write(`[api] listening on http://localhost:${env.PORT}\n`);
  });
}

main().catch((err) => {
  console.error('[api] fatal startup error:', err);
  process.exit(1);
});
