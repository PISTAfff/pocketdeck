/**
 * Orders router.
 *
 * - POST /api/orders → validate, lookup product, recompute total, decrement
 *   stock atomically (Mongoose transaction), persist order, return 201.
 * - GET  /api/orders/track/:id?phone=... → customer self-lookup, soft auth
 *   on phone, rate-limited so the (id, phone) pair can't be brute-forced.
 * - GET  /api/orders → admin listing.
 * - GET  /api/orders/:id → admin single-order view (PII inside, so gated).
 * - PATCH /api/orders/:id/status → admin status transition.
 * - DELETE /api/orders/:id → admin removal.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import type {
  ApiSuccessResponse,
  CreateOrderRequest,
  Order as OrderT,
} from '@pocketdeck/types';
import { ORDER_STATUSES, PACKAGE_OFFERS, isOrderStatus, skuFromSelection } from '@pocketdeck/types';

import { isConnected } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { postRateLimiter, trackingRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { OrderModel, type OrderDoc } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { createOrderSchema } from '../schemas/order.schema.js';
import { serializeOrder } from '../lib/serialize.js';

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
        throw ApiError.serviceUnavailable('Database is not available.');
      }

      const product = await ProductModel.findOne({ slug: productSlug });
      if (!product) {
        throw ApiError.notFound('Product not found.');
      }

      // Compute SKUs + sum of per-board deck surcharges. Package base
      // (350 / 600 / 800 EGP) is authoritative server-side regardless of
      // what the client thinks — we never trust the client for pricing.
      const offer = PACKAGE_OFFERS.find((o) => o.size === packageSize);
      if (!offer) {
        throw ApiError.badRequest('Invalid package size.');
      }
      let totalSurcharge = 0;
      const skus: string[] = [];
      for (const sel of selections) {
        const sku = skuFromSelection(productSlug, sel);
        skus.push(sku);
        const deckOpt = product.options.deck.find((o) => o.value === sel.deck);
        if (!deckOpt) {
          throw ApiError.notFound('Selected deck variant not found.');
        }
        totalSurcharge += deckOpt.priceModifier;
      }
      const totalEGP = offer.basePriceEGP + totalSurcharge;

      // Aggregate per-SKU stock needed so two boards with the same SKU
      // take 2 units atomically.
      const skuCounts = new Map<string, number>();
      for (const sku of skus) {
        skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
      }

      // Wrap decrement + order create in a transaction so a crash between
      // them doesn't strand reserved stock. If Mongo doesn't support
      // sessions (e.g., a standalone local mongod with no replica set),
      // fall back to the previous best-effort try/rollback path.
      let orderDoc: OrderDoc | null = null;
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
      } catch {
        session = null;
      }

      if (session) {
        try {
          await session.withTransaction(async () => {
            for (const [sku, qty] of skuCounts.entries()) {
              const updated = await ProductModel.findOneAndUpdate(
                {
                  slug: productSlug,
                  variants: { $elemMatch: { sku, stock: { $gte: qty } } },
                },
                { $inc: { 'variants.$.stock': -qty } },
                { new: true, session },
              );
              if (!updated) throw ApiError.outOfStock();
            }
            const created = await OrderModel.create(
              [
                {
                  productSlug,
                  packageSize,
                  selections,
                  skus,
                  totalEGP,
                  customer,
                  status: 'pending',
                },
              ],
              { session },
            );
            if (!created[0]) throw new Error('Order create returned no document.');
            orderDoc = created[0];
          });
        } finally {
          await session.endSession();
        }
      } else {
        // Non-transactional fallback: best-effort rollback on failure.
        const decremented: { sku: string; qty: number }[] = [];
        try {
          for (const [sku, qty] of skuCounts.entries()) {
            const updated = await ProductModel.findOneAndUpdate(
              {
                slug: productSlug,
                variants: { $elemMatch: { sku, stock: { $gte: qty } } },
              },
              { $inc: { 'variants.$.stock': -qty } },
              { new: true },
            );
            if (!updated) throw ApiError.outOfStock();
            decremented.push({ sku, qty });
          }
          orderDoc = await OrderModel.create({
            productSlug,
            packageSize,
            selections,
            skus,
            totalEGP,
            customer,
            status: 'pending',
          });
        } catch (err) {
          for (const { sku, qty } of decremented) {
            try {
              await ProductModel.updateOne(
                { slug: productSlug, 'variants.sku': sku },
                { $inc: { 'variants.$.stock': qty } },
              );
            } catch (rollbackErr) {
              const msg =
                rollbackErr instanceof Error
                  ? rollbackErr.message
                  : String(rollbackErr);
              process.stderr.write(
                `[orders] rollback failed for sku ${sku}: ${msg}\n`,
              );
            }
          }
          throw err;
        }
      }

      if (!orderDoc) {
        throw new Error('Order creation produced no document.');
      }
      const payload: ApiSuccessResponse<OrderT> = {
        data: serializeOrder(orderDoc),
      };
      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/orders/track/:id — customer self-lookup.
 *
 * Public but rate-limited so the (id, phone) pair can't be brute-forced.
 * Returns the same 404 whether the order doesn't exist OR the phone
 * doesn't match the one on file, so existence isn't leaked.
 *
 * NOTE: kept ABOVE `/orders/:id` because Express matches routes in order
 * and `/:id` would otherwise swallow the literal `/track/...` segment.
 */
ordersRouter.get(
  '/orders/track/:id',
  trackingRateLimiter,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { phone } = req.query as { phone?: string };
      if (!isConnected()) {
        throw ApiError.serviceUnavailable('Database is not available.');
      }
      if (!phone || !mongoose.isValidObjectId(id)) {
        throw ApiError.notFound('Order not found.');
      }
      const order = await OrderModel.findById(id);
      if (!order || order.customer.phone !== phone.trim()) {
        throw ApiError.notFound('Order not found.');
      }
      const payload: ApiSuccessResponse<OrderT> = { data: serializeOrder(order) };
      res.status(200).json(payload);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/orders — admin listing.
 * Returns the most recent N orders (newest first). Quick filter via
 * ?status=pending. Requires admin token.
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
    if (status && isOrderStatus(status)) {
      filter.status = status;
    }
    const n = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(n);
    const payload: ApiSuccessResponse<OrderT[]> = {
      data: orders.map(serializeOrder),
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id — admin single-order view.
 * Contains customer PII (name, phone, address) so it requires admin auth.
 * Customers reach their own order via /api/orders/track/:id.
 */
ordersRouter.get('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isConnected()) {
      throw ApiError.serviceUnavailable('Database is not available.');
    }
    if (!mongoose.isValidObjectId(id)) {
      throw ApiError.notFound('Order not found.');
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found.');
    }
    const payload: ApiSuccessResponse<OrderT> = { data: serializeOrder(order) };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id/status — admin status transition.
 * Body: { status: OrderStatus }. Returns the updated order.
 */
ordersRouter.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: unknown };
    if (!isOrderStatus(status)) {
      throw ApiError.badRequest(
        `Invalid status. Expected one of: ${ORDER_STATUSES.join(', ')}.`,
      );
    }
    if (!isConnected()) {
      throw ApiError.serviceUnavailable('Database is not available.');
    }
    if (!mongoose.isValidObjectId(id)) {
      throw ApiError.notFound('Order not found.');
    }
    const order = await OrderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );
    if (!order) {
      throw ApiError.notFound('Order not found.');
    }
    const payload: ApiSuccessResponse<OrderT> = { data: serializeOrder(order) };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/orders/:id — admin removal.
 * Hard-deletes the order. Used by the dashboard to scrub test orders
 * and cancellations that should not stay in history.
 */
ordersRouter.delete('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isConnected()) {
      throw ApiError.serviceUnavailable('Database is not available.');
    }
    if (!mongoose.isValidObjectId(id)) {
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
