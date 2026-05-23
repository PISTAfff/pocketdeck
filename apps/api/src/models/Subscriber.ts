/**
 * Mongoose schema for the Subscriber document.
 *
 * Mirrors the `Subscriber` interface from `@pocketdeck/types`. Email is a
 * unique index — duplicate signup attempts return the existing record.
 */
import { Schema, model, type HydratedDocument } from 'mongoose';
import type { Subscriber as SubscriberT } from '@pocketdeck/types';

const SubscriberSchema = new Schema<SubscriberT>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete (ret as { _id?: unknown })._id;
        return ret;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

export type SubscriberDoc = HydratedDocument<SubscriberT>;

export const SubscriberModel = model<SubscriberT>(
  'Subscriber',
  SubscriberSchema,
);
