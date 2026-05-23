/**
 * Per-IP rate limiter for POST routes.
 *
 * Configured by RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS. On limit hit, returns
 * 429 with the contract envelope and code RATE_LIMITED.
 */
import { rateLimit } from 'express-rate-limit';

import { env } from '../lib/env.js';
import { ApiError, asEnvelope } from '../lib/errors.js';

export const postRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    const err = ApiError.rateLimited('Too many requests from this IP.');
    res.status(err.status).json(asEnvelope(err));
  },
});
