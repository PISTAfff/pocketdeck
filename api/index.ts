/**
 * Vercel serverless entry for the PocketDeck API.
 *
 * Wraps the SAME Express app used in local dev — `createApp()` from
 * `apps/api/src/app.ts` — but instead of `app.listen()` we export a Node
 * `(req, res)` handler that Vercel's Node runtime invokes per request.
 *
 * Deliberately does NOT import `apps/api/src/index.ts`: that file calls
 * `app.listen()` and starts the Render keep-warm self-ping loop + signal
 * handlers, none of which make sense (or work) on serverless.
 *
 * Cold-start caching: the built Express app and the Mongo connection are
 * memoized in module scope so they survive across warm invocations on the
 * same instance. We only pay `createApp()` + `connect()` once per cold
 * start; subsequent requests reuse both.
 *
 * `assertProductionEnv()` runs on first build of the app — if ADMIN_PASSWORD
 * or MONGODB_URI are missing/invalid in production it throws, which surfaces
 * as a 500 on the first request. That's the intended fail-loud behaviour:
 * better a loud boot error than a silently insecure deploy.
 *
 * NOTE on imports: the API is ESM with `.js` specifiers that resolve to
 * `.ts` under bundler/esbuild resolution — so this file uses `.js`
 * specifiers too. Vercel's @vercel/node bundles the function with esbuild,
 * which follows them into the TypeScript sources (and into the symlinked
 * `@pocketdeck/types` workspace package via its `exports` map).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app.js';
import { connect } from '../apps/api/src/lib/db.js';
import { assertProductionEnv } from '../apps/api/src/lib/env.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

// Inferred from createApp() so this file imports no third-party types
// directly — keeps it resolvable regardless of where node_modules sits
// in the pnpm workspace layout.
let app: ReturnType<typeof createApp> | undefined;
let connectOnce: Promise<unknown> | undefined;

function getApp(): Express {
  if (!app) {
    // Throws in production if the security-sensitive env vars aren't set.
    assertProductionEnv();
    app = createApp();
  }
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Kick off (and cache) the Mongo connection on first invocation. `connect()`
  // swallows its own failures and resolves `false`, so this never rejects —
  // routes guard with `isConnected()` and return 503 if Mongo isn't up.
  if (!connectOnce) connectOnce = connect();
  await connectOnce;
  // An Express app instance IS a Node request listener — hand the request off.
  (getApp() as unknown as NodeHandler)(req, res);
}
