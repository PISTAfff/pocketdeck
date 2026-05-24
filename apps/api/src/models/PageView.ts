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

// Sorted index for analytics queries (newest first).
PageViewSchema.index({ createdAt: -1 });
// TTL: auto-expire rows after 90 days so the collection doesn't grow
// unbounded. Analytics windows above this rely on aggregated rollups,
// not raw events.
PageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type PageViewDoc = HydratedDocument<PageViewT>;
export const PageViewModel = model<PageViewT>('PageView', PageViewSchema);
