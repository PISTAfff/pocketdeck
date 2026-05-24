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
import { PACKAGE_OFFERS, skuFromSelection } from '@pocketdeck/types';

import { isConnected } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { requireAdmin } from '../middleware/adminAuth.js';
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
      const { productSlug, packageSize, selections, customer } = body;

      if (!isConnected()) {
        throw ApiError.notFound('Product not found.');
      }

      const product = await ProductModel.findOne({ slug: productSlug });
      if (!product) {
        throw ApiError.notFound('Product not found.');
      }

      // Compute SKUs + sum of per-board deck surcharges. Package base
      // (350 / 600 / 800 EGP) is authoritative server-side regardless of
      // what the client thinks - we never trust the client for pricing.
      const offer = PACKAGE_OFFERS.find((o) => o.size === packageSize);
      if (!offer) {
        throw ApiError.badRequest('Invalid package size.');
      }
      let totalSurcharge = 0;
      const skus: string[] = [];
      for (const sel of selections) {
        const sku = skuFromSelection(productSlug, sel);
        skus.push(sku);
        const deckOpt = product.options.deck.find(
          (o) => o.value === sel.deck,
        );
        if (!deckOpt) {
          throw ApiError.notFound('Selected deck variant not found.');
        }
        totalSurcharge += deckOpt.priceModifier;
      }
      const totalEGP = offer.basePriceEGP + totalSurcharge;

      // Stock decrement per SKU. Aggregate per-SKU counts so two boards
      // with the same SKU still take 2 units of stock atomically. If
      // any decrement fails we attempt to roll back the ones that
      // succeeded so partial reservations don't strand inventory.
      const skuCounts = new Map<string, number>();
      for (const sku of skus) {
        skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
      }
      const decremented: { sku: string; qty: number }[] = [];
      try {
        for (const [sku, qty] of skuCounts.entries()) {
          const updated = await ProductModel.findOneAndUpdate(
            {
              slug: productSlug,
              variants: {
                $elemMatch: { sku, stock: { $gte: qty } },
              },
            },
            { $inc: { 'variants.$.stock': -qty } },
            { new: true },
          );
          if (!updated) {
            throw ApiError.outOfStock();
          }
          decremented.push({ sku, qty });
        }
      } catch (err) {
        // Roll back successful decrements
        for (const { sku, qty } of decremented) {
          await ProductModel.updateOne(
            { slug: productSlug, 'variants.sku': sku },
            { $inc: { 'variants.$.stock': qty } },
          ).catch(() => undefined);
        }
        throw err;
      }

      const order = await OrderModel.create({
        productSlug,
        packageSize,
        selections,
        skus,
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

/**
 * GET /api/orders - admin listing. Returns the most recent N orders
 * (newest first). Quick filter via ?status=pending. No auth in this
 * fictional storefront, but the route is intentionally separate so a
 * real deployment can gate it.
 */
ordersRouter.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    if (!isConnected()) {
      const payload: ApiSuccessResponse<OrderT[]> = { data: [] };
      res.status(200).json(payload);
      return;
    }
    const { status, limit } = req.query as { status?: string; limit?: string };
    const filter: Record<string, unknown> = {};
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (status && validStatuses.includes(status)) {
      filter.status = status;
    }
    const n = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(n);
    const payload: ApiSuccessResponse<OrderT[]> = {
      data: orders.map((o) => o.toJSON() as unknown as OrderT),
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id/status - admin status transition.
 * Body: { status: OrderStatus }. Returns the updated order.
 */
ordersRouter.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status.');
    }
    if (!mongoose.isValidObjectId(id) || !isConnected()) {
      throw ApiError.notFound('Order not found.');
    }
    const order = await OrderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
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

/**
 * DELETE /api/orders/:id - admin removal.
 * Hard-deletes the order. Used by the dashboard to scrub test orders
 * and cancellations that should not stay in history.
 */
ordersRouter.delete('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isConnected()) {
      throw ApiError.notFound('Order not found.');
    }
    const removed = await OrderModel.findByIdAndDelete(id);
    if (!removed) {
      throw ApiError.notFound('Order not found.');
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/track/:id?phone=01XXXXXXXXX
 * Customer lookup: matches order ID plus phone number for soft auth.
 * Returns the order without leaking PII when the phone doesn't match.
 */
ordersRouter.get('/orders/track/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone } = req.query as { phone?: string };
    if (!phone || !mongoose.isValidObjectId(id) || !isConnected()) {
      throw ApiError.notFound('Order not found.');
    }
    const order = await OrderModel.findById(id);
    if (!order || order.customer.phone !== phone.trim()) {
      // Same response either way - don't leak whether the ID exists.
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
