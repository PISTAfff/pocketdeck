/**
 * Orders router.
 *
 * - POST /api/orders → validate, lookup product, recompute total, decrement
 *   stock atomically, persist order, return 201.
 * - GET  /api/orders/:id → fetch by id, 404 on bad/missing id.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import type {
  ApiSuccessResponse,
  CreateOrderRequest,
  Order as OrderT,
} from '@pocketdeck/types';
import { skuFromSelection } from '@pocketdeck/types';

import { isConnected } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { postRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { createOrderSchema } from '../schemas/order.schema.js';

export const ordersRouter = Router();

ordersRouter.post(
  '/orders',
  postRateLimiter,
  validate(createOrderSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateOrderRequest;
      const { productSlug, selection, quantity, customer } = body;

      if (!isConnected()) {
        throw ApiError.notFound('Product not found.');
      }

      const product = await ProductModel.findOne({ slug: productSlug });
      if (!product) {
        throw ApiError.notFound('Product not found.');
      }

      const sku = skuFromSelection(productSlug, selection);

      // Find the deck option to read its priceModifier (authoritative price).
      const deckOpt = product.options.deck.find(
        (o) => o.value === selection.deck,
      );
      if (!deckOpt) {
        throw ApiError.notFound('Selected deck variant not found.');
      }
      const totalEGP = (product.basePriceEGP + deckOpt.priceModifier) * quantity;

      // Atomically decrement stock for this SKU only if enough is available.
      const updated = await ProductModel.findOneAndUpdate(
        {
          slug: productSlug,
          variants: {
            $elemMatch: { sku, stock: { $gte: quantity } },
          },
        },
        { $inc: { 'variants.$.stock': -quantity } },
        { new: true },
      );
      if (!updated) {
        throw ApiError.outOfStock();
      }

      const order = await OrderModel.create({
        productSlug,
        selection,
        sku,
        quantity,
        totalEGP,
        customer,
        status: 'pending',
      });

      const payload: ApiSuccessResponse<OrderT> = {
        data: order.toJSON() as unknown as OrderT,
      };
      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  },
);

ordersRouter.get('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isConnected()) {
      throw ApiError.notFound('Order not found.');
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found.');
    }
    const payload: ApiSuccessResponse<OrderT> = {
      data: order.toJSON() as unknown as OrderT,
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});
