/**
 * Joi validation for `CreateSubscriberRequest`.
 *
 * Email is RFC-style, max 120 chars, and lowercased + trimmed before save.
 */
import Joi from 'joi';
import type { CreateSubscriberRequest } from '@pocketdeck/types';

export const createSubscriberSchema = Joi.object<CreateSubscriberRequest>({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2, tlds: false })
    .max(120)
    .required()
    .messages({
      'string.email': 'Email must be a valid email address.',
      'string.empty': 'Email is required.',
      'string.max': 'Email must be at most 120 characters.',
      'any.required': 'Email is required.',
    }),
});
