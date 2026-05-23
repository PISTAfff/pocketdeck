/**
 * Mongoose schema for the Product document.
 *
 * Mirrors the `Product` interface from `@pocketdeck/types`. Options are
 * nested subschemas; variants are a sub-array indexed for fast SKU lookup.
 */
import { Schema, model, type HydratedDocument } from 'mongoose';
import type {
  Product as ProductT,
  VariantOption,
  Variant,
} from '@pocketdeck/types';

const VariantOptionSchema = new Schema<VariantOption>(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
    swatchHex: { type: String },
    thumbnail: { type: String },
    priceModifier: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const VariantSchema = new Schema<Variant>(
  {
    sku: { type: String, required: true },
    deck: { type: String, required: true },
    wheel: { type: String, required: true },
    truck: { type: String, required: true },
    grip: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const ProductSchema = new Schema<ProductT>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    basePriceEGP: { type: Number, required: true },
    options: {
      deck: { type: [VariantOptionSchema], default: [] },
      wheel: { type: [VariantOptionSchema], default: [] },
      truck: { type: [VariantOptionSchema], default: [] },
      grip: { type: [VariantOptionSchema], default: [] },
    },
    variants: { type: [VariantSchema], default: [] },
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

// Allow fast `variants.sku` lookup.
ProductSchema.index({ slug: 1, 'variants.sku': 1 });

export type ProductDoc = HydratedDocument<ProductT>;

export const ProductModel = model<ProductT>('Product', ProductSchema);
