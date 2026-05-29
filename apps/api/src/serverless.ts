/**
 * Serverless handler source for the Vercel deployment.
 *
 * This is the SAME Express app as local dev — `createApp()` — exposed as a
 * Node `(req, res)` handler instead of `app.listen()`. It deliberately does
 * NOT import `index.ts` (that calls `listen()` + starts the Render keep-warm
 * loop + signal handlers, none of which work on serverless).
 *
 * At deploy time this file is bundled by esbuild into a single self-contained
 * `api/_app.mjs` (see the `buildCommand` in the repo-root `vercel.json`), and
 * `api/index.ts` re-exports from that bundle. Bundling is what makes the
 * `@pocketdeck/types` workspace package work on Vercel: it's published as raw
 * TypeScript (its `exports` point at `./src/index.ts`), which `@vercel/node`'s
 * dependency tracer can't execute at runtime — but esbuild compiles and inlines
 * it (and every other dependency) into the bundle, so there's nothing left to
 * resolve at runtime.
 *
 * Cold-start caching: the built app and the Mongo connection are memoized in
 * module scope so warm invocations reuse them. `assertProductionEnv()` runs on
 * first app build — a missing/weak ADMIN_PASSWORD or MONGODB_URI surfaces as a
 * loud 500 rather than a silently-insecure deploy.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app.js';
import { connect, isConnected } from './lib/db.js';
import { assertProductionEnv } from './lib/env.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let app: ReturnType<typeof createApp> | undefined;
let connectPromise: Promise<boolean> | undefined;

function getApp(): ReturnType<typeof createApp> {
  if (!app) {
    assertProductionEnv();
    app = createApp();
  }
  return app;
}

/**
 * Ensure Mongo is connected before handling a request.
 *
 * - Short-circuits when already connected (the warm path — cheap sync check).
 * - Caches the in-flight connect promise so concurrent cold requests don't
 *   each kick off their own `mongoose.connect`.
 * - Crucially, clears the cached promise if the attempt did NOT connect, so
 *   the next request retries instead of being stranded on a resolved-false
 *   promise. Caching the failure was why the first cold hit 404'd while warm
 *   hits succeeded.
 */
async function ensureConnected(): Promise<void> {
  if (isConnected()) return;
  if (!connectPromise) {
    connectPromise = connect().finally(() => {
      if (!isConnected()) connectPromise = undefined;
    });
  }
  await connectPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await ensureConnected();
  (getApp() as unknown as NodeHandler)(req, res);
}
