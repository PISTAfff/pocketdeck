/**
 * POST /api/subscribers
 *
 * Idempotent newsletter signup. Returns 201 even if the email is already
 * subscribed — the existing record is returned in that case.
 */
import { Router } from 'express';
import type {
  ApiSuccessResponse,
  CreateSubscriberRequest,
  Subscriber as SubscriberT,
} from '@pocketdeck/types';

import { postRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { SubscriberModel } from '../models/Subscriber.js';
import { createSubscriberSchema } from '../schemas/subscriber.schema.js';

export const subscribersRouter = Router();

subscribersRouter.post(
  '/subscribers',
  postRateLimiter,
  validate(createSubscriberSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as CreateSubscriberRequest;

      const existing = await SubscriberModel.findOne({ email });
      const subscriber =
        existing ?? (await SubscriberModel.create({ email }));

      const payload: ApiSuccessResponse<SubscriberT> = {
        data: subscriber.toJSON() as unknown as SubscriberT,
      };
      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  },
);
