/**
 * Vercel serverless function entry.
 *
 * The real handler lives in `apps/api/src/serverless.ts` and is bundled by
 * esbuild into `./_app.mjs` during the build (see `buildCommand` in the
 * repo-root `vercel.json`). That bundle is fully self-contained — every
 * dependency, including the raw-TypeScript `@pocketdeck/types` workspace
 * package, is inlined — so nothing needs to resolve at runtime.
 *
 * This file is the thin entry `@vercel/node` compiles as the function; it
 * just re-exports the bundle's default handler. `_app.mjs` is generated at
 * build time (gitignored), so it won't exist in a fresh checkout — that's
 * expected; the Vercel build creates it before this file is compiled.
 */
// @ts-ignore — generated at build time by the esbuild buildCommand.
export { default } from './_app.mjs';
