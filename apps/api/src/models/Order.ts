/**
 * Mongoose schema for the Order document.
 *
 * Mirrors the `Order` interface from `@pocketdeck/types`. Persists the
 * configurator selection, computed totals, and the customer's shipping
 * details.
 */
import { Schema, model, type HydratedDocument } from 'mongoose';
import type {
  Order as OrderT,
  ConfigurationSelection,
  OrderCustomer,
  OrderStatus,
} from '@pocketdeck/types';

const SelectionSchema = new Schema<ConfigurationSelection>(
  {
    deck: { type: String, required: true },
    wheel: { type: String, required: true },
    truck: { type: String, required: true },
    grip: { type: String, required: true },
  },
  { _id: false },
);

const CustomerSchema = new Schema<OrderCustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    governorate: { type: String, required: true },
  },
  { _id: false },
);

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

const OrderSchema = new Schema<OrderT>(
  {
    productSlug: { type: String, required: true, index: true },
    packageSize: { type: Number, required: true, enum: [1, 2, 3] },
    selections: {
      type: [SelectionSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) =>
          Array.isArray(v) && v.length >= 1 && v.length <= 3,
        message: 'selections must contain 1-3 boards',
      },
    },
    skus: {
      type: [String],
      required: true,
      index: true,
    },
    totalEGP: { type: Number, required: true },
    customer: { type: CustomerSchema, required: true },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: 'pending',
    },
  },
  {
    timestamps: true,
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

export type OrderDoc = HydratedDocument<OrderT>;

export const OrderModel = model<OrderT>('Order', OrderSchema);
