/**
 * Joi body validation middleware.
 *
 * On failure returns 422 with `errors: [{ field, message }]` matching the
 * contract envelope. On success replaces `req.body` with the validated +
 * coerced (trimmed, lowercased) value.
 */
import type { RequestHandler } from 'express';
import type { ObjectSchema } from 'joi';

import { ApiError } from '../lib/errors.js';

export function validate<T>(schema: ObjectSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const fieldErrors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      next(ApiError.validation('Request body failed validation.', fieldErrors));
      return;
    }

    req.body = value;
    next();
  };
}
