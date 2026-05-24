/**
 * Mongoose schema for the PageView document.
 *
 * One row per recorded page view. `visitorId` is a hashed identifier
 * the client generates and persists in localStorage so we can count
 * unique visitors without storing IPs or personal data.
 */
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface PageViewT {
  id: string;
  path: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
  createdAt: Date;
}

const PageViewSchema = new Schema<PageViewT>(
  {
    path: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    referrer: { type: String },
    userAgent: { type: String },
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
  },
);

PageViewSchema.index({ createdAt: -1 });

export type PageViewDoc = HydratedDocument<PageViewT>;
export const PageViewModel = model<PageViewT>('PageView', PageViewSchema);
