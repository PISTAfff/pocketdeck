/**
 * Centralized error handler.
 *
 * Converts any thrown error into the contract envelope. Express 5
 * propagates async route errors here automatically. Beyond `ApiError`
 * (the canonical case), we recognise:
 *   - body-parse failures from express.json → 400 VALIDATION_ERROR
 *   - Mongoose CastError → 400 ("Invalid id.")
 *   - Mongoose ValidationError → 422 with field paths
 *   - Mongoose duplicate-key (E11000) → 409 ("Already exists.")
 * Anything else falls through to a 500 with a stderr log.
 */
import mongoose from 'mongoose';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiFieldError } from '@pocketdeck/types';

import { ApiError, ErrorCode, asEnvelope } from '../lib/errors.js';

function mongooseValidationToFieldErrors(
  err: mongoose.Error.ValidationError,
): ApiFieldError[] {
  return Object.entries(err.errors).map(([field, e]) => ({
    field,
    message: e.message,
  }));
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json(asEnvelope(err));
    return;
  }

  // Mongoose error mapping — give clients a useful 4xx instead of a
  // generic 500 when the failure is their input, not our bug.
  if (err instanceof mongoose.Error.CastError) {
    const apiErr = ApiError.badRequest(`Invalid ${err.path}.`);
    res.status(apiErr.status).json(asEnvelope(apiErr));
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const apiErr = ApiError.validation(
      'Document validation failed.',
      mongooseValidationToFieldErrors(err),
    );
    res.status(apiErr.status).json(asEnvelope(apiErr));
    return;
  }
  const maybeMongoErr = err as { code?: number; name?: string };
  if (maybeMongoErr?.code === 11000 || maybeMongoErr?.name === 'MongoServerError') {
    if (maybeMongoErr.code === 11000) {
      const apiErr = new ApiError(409, ErrorCode.BAD_REQUEST, 'Duplicate value.');
      res.status(apiErr.status).json(asEnvelope(apiErr));
      return;
    }
  }

  // express.json bad-body errors carry `type: 'entity.parse.failed'`.
  const maybe = err as { type?: string; status?: number; message?: string };
  if (maybe?.type === 'entity.parse.failed' || maybe?.status === 400) {
    const apiErr = new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Malformed request body.');
    res.status(400).json(asEnvelope(apiErr));
    return;
  }

  // Anything else, log to stderr (allowed by lint config) and respond 500.
  console.error('[api] unhandled error:', err);
  const fallback = ApiError.internal();
  res.status(fallback.status).json(asEnvelope(fallback));
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound('Endpoint not found.'));
};
