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
import { connect } from './lib/db.js';
import { assertProductionEnv } from './lib/env.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let app: ReturnType<typeof createApp> | undefined;
let connectOnce: Promise<unknown> | undefined;

function getApp(): ReturnType<typeof createApp> {
  if (!app) {
    assertProductionEnv();
    app = createApp();
  }
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!connectOnce) connectOnce = connect();
  await connectOnce;
  (getApp() as unknown as NodeHandler)(req, res);
}
