/**
 * Mongoose schema for the Newsletter document.
 *
 * Each row is one campaign — the HTML body the admin composed plus a
 * snapshot of the recipient count at send time. We record the HTML
 * even though sending is currently a no-op so the admin has a history
 * to refer back to and so a real SMTP provider can be wired in later
 * without changing the API surface.
 */
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface NewsletterT {
  id: string;
  subject: string;
  bodyHtml: string;
  recipientCount: number;
  createdAt: Date;
}

const NewsletterSchema = new Schema<NewsletterT>(
  {
    subject: { type: String, required: true, maxlength: 200 },
    bodyHtml: { type: String, required: true, maxlength: 50_000 },
    recipientCount: { type: Number, required: true },
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

NewsletterSchema.index({ createdAt: -1 });

export type NewsletterDoc = HydratedDocument<NewsletterT>;
export const NewsletterModel = model<NewsletterT>('Newsletter', NewsletterSchema);
