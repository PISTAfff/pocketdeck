/**
 * Rate limiters.
 *
 * - `postRateLimiter`: covers POST-heavy public endpoints (subscribe,
 *   order create, login). Tight by default (env-driven, 10/min).
 * - `trackingRateLimiter`: covers `/api/orders/track/:id`. Public, so
 *   it's the brute-force surface — looser per-window but ip-scoped so
 *   one attacker can't enumerate (id, phone) pairs.
 * - `analyticsRateLimiter`: covers `/api/admin/track`. Public, but ought
 *   to look like a metric ping, not a write surface. Cap aggressively.
 *
 * All limiters share the same 429 envelope so the client error handling
 * stays uniform.
 */
import { rateLimit } from 'express-rate-limit';

import { env } from '../lib/env.js';
import { ApiError, asEnvelope } from '../lib/errors.js';

const limitHandler = (_req: unknown, res: { status: (s: number) => { json: (b: unknown) => void } }) => {
  const err = ApiError.rateLimited('Too many requests from this IP.');
  res.status(err.status).json(asEnvelope(err));
};

export const postRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler,
});

/** 20 lookups per IP per minute — enough for a frustrated customer
 *  retrying, way too few for a brute-force enumeration. */
export const trackingRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler,
});

/** 60 page-view pings per IP per minute. Anything beyond that is a
 *  buggy client or a flood — drop with 429. */
export const analyticsRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler,
});
