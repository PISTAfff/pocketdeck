/**
 * Centralized error handler.
 *
 * Converts any thrown error into the contract envelope. Express 5 propagates
 * async route errors here automatically.
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';

import { ApiError, asEnvelope } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json(asEnvelope(err));
    return;
  }

  // express.json bad-body errors carry `type: 'entity.parse.failed'`.
  const maybe = err as { type?: string; status?: number; message?: string };
  if (maybe?.type === 'entity.parse.failed' || maybe?.status === 400) {
    const apiErr = new ApiError(400, 'VALIDATION_ERROR', 'Malformed request body.');
    res.status(400).json(asEnvelope(apiErr));
    return;
  }

  // Anything else — log to stderr (allowed by lint config) and respond 500.
  console.error('[api] unhandled error:', err);
  const fallback = ApiError.internal();
  res.status(fallback.status).json(asEnvelope(fallback));
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound('Endpoint not found.'));
};
