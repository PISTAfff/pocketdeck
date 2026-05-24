/**
 * Admin router.
 *
 * - POST /api/admin/login → exchange shared password for a token.
 * - GET  /api/admin/stats → aggregate revenue, status counts, top builds.
 *
 * The two destructive admin operations (list orders, update status)
 * live on the orders router but they share the requireAdmin gate from
 * `middleware/adminAuth`.
 */
import mongoose from 'mongoose';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OrderModel } from '../models/Order.js';
import { PageViewModel } from '../models/PageView.js';
import { SubscriberModel } from '../models/Subscriber.js';
import { NewsletterModel } from '../models/Newsletter.js';
import { ProductModel } from '../models/Product.js';
import { isConnected } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { postRateLimiter } from '../middleware/rateLimit.js';
import {
  issueAdminToken,
  passwordsMatch,
  requireAdmin,
} from '../middleware/adminAuth.js';

export const adminRouter = Router();

// Login is rate-limited so a leaked URL can't be brute-forced.
adminRouter.post(
  '/admin/login',
  postRateLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = (req.body ?? {}) as { password?: string };
      if (typeof password !== 'string' || password.length === 0) {
        throw ApiError.badRequest('Password required.');
      }
      if (!passwordsMatch(password)) {
        throw ApiError.notFound('Login failed.');
      }
      const token = issueAdminToken();
      res.status(200).json({ data: { token } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Aggregate dashboard stats.
 * Revenue is summed from `delivered` orders only (the spec: completed
 * orders count toward sales). Pending/confirmed/shipped feed the
 * pipeline counts but not revenue.
 */
adminRouter.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    if (!isConnected()) {
      res.status(200).json({
        data: {
          totalOrders: 0,
          deliveredCount: 0,
          deliveredRevenueEGP: 0,
          averageOrderEGP: 0,
          byStatus: {
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
          },
          topConfigurations: [],
          dailySales: [],
        },
      });
      return;
    }

    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);
    const [agg] = await OrderModel.aggregate<{
      total: number;
      delivered: number;
      revenue: number;
      avgEGP: number;
    }>([
      {
        $facet: {
          total: [{ $count: 'n' }],
          delivered: [{ $match: { status: 'delivered' } }, { $count: 'n' }],
          revenueAgg: [
            { $match: { status: 'delivered' } },
            { $group: { _id: null, sum: { $sum: '$totalEGP' } } },
          ],
          avgAgg: [
            { $match: { status: 'delivered' } },
            { $group: { _id: null, avg: { $avg: '$totalEGP' } } },
          ],
        },
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
          delivered: { $ifNull: [{ $arrayElemAt: ['$delivered.n', 0] }, 0] },
          revenue: { $ifNull: [{ $arrayElemAt: ['$revenueAgg.sum', 0] }, 0] },
          avgEGP: { $ifNull: [{ $arrayElemAt: ['$avgAgg.avg', 0] }, 0] },
        },
      },
    ]);

    const byStatusRows = await OrderModel.aggregate<{
      _id: string;
      n: number;
    }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const byStatus = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    } as Record<string, number>;
    for (const row of byStatusRows) byStatus[row._id] = row.n;

    // Multi-board orders contribute one tally per board in the package -
    // we unwind `selections` so every board counts individually for the
    // popularity ranking. Revenue is split across the boards proportional
    // to count so a 3-board order's revenue doesn't get tripled.
    const topConfigurations = await OrderModel.aggregate<{
      _id: { deck: string; wheel: string; truck: string; grip: string };
      n: number;
      revenue: number;
    }>([
      {
        $addFields: {
          _boardRevenue: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$selections', []] } }, 0] },
              {
                $divide: [
                  '$totalEGP',
                  { $size: { $ifNull: ['$selections', []] } },
                ],
              },
              '$totalEGP',
            ],
          },
          // Backwards-compat: fall back to legacy `selection` for orders
          // written before the multi-board migration.
          _boards: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$selections', []] } }, 0] },
              '$selections',
              { $cond: [{ $ifNull: ['$selection', false] }, ['$selection'], []] },
            ],
          },
        },
      },
      { $unwind: '$_boards' },
      {
        $group: {
          _id: {
            deck: '$_boards.deck',
            wheel: '$_boards.wheel',
            truck: '$_boards.truck',
            grip: '$_boards.grip',
          },
          n: { $sum: 1 },
          revenue: { $sum: '$_boardRevenue' },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]);

    const dailySales = await OrderModel.aggregate<{
      _id: string;
      orders: number;
      revenue: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$totalEGP', 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      data: {
        totalOrders: agg?.total ?? 0,
        deliveredCount: agg?.delivered ?? 0,
        deliveredRevenueEGP: agg?.revenue ?? 0,
        averageOrderEGP: Math.round(agg?.avgEGP ?? 0),
        byStatus,
        topConfigurations: topConfigurations.map((t) => ({
          selection: t._id,
          count: t.n,
          revenueEGP: t.revenue,
        })),
        dailySales: dailySales.map((d) => ({
          date: d._id,
          orders: d.orders,
          revenueEGP: d.revenue,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics
 *
 * Audience + revenue analytics for the dashboard's Analytics tab.
 * Returns 30 days of daily traffic + sales rollups, top pages, top
 * configurations, and totals. Designed for one round-trip so the
 * frontend can render every chart without coordinating fetches.
 */
adminRouter.get('/admin/analytics', requireAdmin, async (_req, res, next) => {
  try {
    if (!isConnected()) {
      res.status(200).json({
        data: {
          totals: {
            pageViews: 0,
            uniqueVisitors: 0,
            totalOrders: 0,
            deliveredCount: 0,
            deliveredRevenueEGP: 0,
            conversionRate: 0,
          },
          daily: [],
          topConfigurations: [],
        },
      });
      return;
    }

    const days = 30;
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * days);

    const [viewTotalsAgg] = await PageViewModel.aggregate<{
      views: number;
      uniqueVisitors: number;
    }>([
      // Match the 30-day window the dashboard advertises so the KPI
      // card and the chart underneath agree.
      { $match: { createdAt: { $gte: since } } },
      {
        $facet: {
          views: [{ $count: 'n' }],
          unique: [
            { $group: { _id: '$visitorId' } },
            { $count: 'n' },
          ],
        },
      },
      {
        $project: {
          views: { $ifNull: [{ $arrayElemAt: ['$views.n', 0] }, 0] },
          uniqueVisitors: { $ifNull: [{ $arrayElemAt: ['$unique.n', 0] }, 0] },
        },
      },
    ]);

    const [orderTotalsAgg] = await OrderModel.aggregate<{
      total: number;
      delivered: number;
      revenue: number;
    }>([
      {
        $facet: {
          total: [{ $count: 'n' }],
          delivered: [{ $match: { status: 'delivered' } }, { $count: 'n' }],
          revenue: [
            { $match: { status: 'delivered' } },
            { $group: { _id: null, sum: { $sum: '$totalEGP' } } },
          ],
        },
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
          delivered: { $ifNull: [{ $arrayElemAt: ['$delivered.n', 0] }, 0] },
          revenue: { $ifNull: [{ $arrayElemAt: ['$revenue.sum', 0] }, 0] },
        },
      },
    ]);

    // Daily traffic over the window: views + unique visitors per day.
    const dailyViews = await PageViewModel.aggregate<{
      _id: string;
      views: number;
      uniques: string[];
    }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          views: { $sum: 1 },
          uniques: { $addToSet: '$visitorId' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily sales over the window: orders + delivered revenue per day.
    const dailyOrders = await OrderModel.aggregate<{
      _id: string;
      orders: number;
      revenue: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$totalEGP', 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Stitch into a single dense series for the chart, filling missing
    // days with zeros so the X axis is contiguous regardless of which
    // days actually had data.
    const viewByDay = new Map(
      dailyViews.map((d) => [d._id, { views: d.views, uniques: d.uniques.length }]),
    );
    const ordersByDay = new Map(
      dailyOrders.map((d) => [d._id, { orders: d.orders, revenue: d.revenue }]),
    );

    const daily: {
      date: string;
      views: number;
      uniqueVisitors: number;
      orders: number;
      revenueEGP: number;
    }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 1000 * 60 * 60 * 24);
      const key = d.toISOString().slice(0, 10);
      const v = viewByDay.get(key) ?? { views: 0, uniques: 0 };
      const o = ordersByDay.get(key) ?? { orders: 0, revenue: 0 };
      daily.push({
        date: key,
        views: v.views,
        uniqueVisitors: v.uniques,
        orders: o.orders,
        revenueEGP: o.revenue,
      });
    }

    // Multi-board orders contribute one tally per board in the package -
    // we unwind `selections` so every board counts individually for the
    // popularity ranking. Revenue is split across the boards proportional
    // to count so a 3-board order's revenue doesn't get tripled.
    const topConfigurations = await OrderModel.aggregate<{
      _id: { deck: string; wheel: string; truck: string; grip: string };
      n: number;
      revenue: number;
    }>([
      {
        $addFields: {
          _boardRevenue: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$selections', []] } }, 0] },
              {
                $divide: [
                  '$totalEGP',
                  { $size: { $ifNull: ['$selections', []] } },
                ],
              },
              '$totalEGP',
            ],
          },
          // Backwards-compat: fall back to legacy `selection` for orders
          // written before the multi-board migration.
          _boards: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$selections', []] } }, 0] },
              '$selections',
              { $cond: [{ $ifNull: ['$selection', false] }, ['$selection'], []] },
            ],
          },
        },
      },
      { $unwind: '$_boards' },
      {
        $group: {
          _id: {
            deck: '$_boards.deck',
            wheel: '$_boards.wheel',
            truck: '$_boards.truck',
            grip: '$_boards.grip',
          },
          n: { $sum: 1 },
          revenue: { $sum: '$_boardRevenue' },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]);

    const pageViews = viewTotalsAgg?.views ?? 0;
    const uniqueVisitors = viewTotalsAgg?.uniqueVisitors ?? 0;
    const totalOrders = orderTotalsAgg?.total ?? 0;
    const deliveredCount = orderTotalsAgg?.delivered ?? 0;
    const deliveredRevenueEGP = orderTotalsAgg?.revenue ?? 0;
    const conversionRate =
      uniqueVisitors > 0 ? totalOrders / uniqueVisitors : 0;

    res.status(200).json({
      data: {
        totals: {
          pageViews,
          uniqueVisitors,
          totalOrders,
          deliveredCount,
          deliveredRevenueEGP,
          conversionRate,
        },
        daily,
        topConfigurations: topConfigurations.map((t) => ({
          selection: t._id,
          count: t.n,
          revenueEGP: t.revenue,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/track
 *
 * Public endpoint (not gated by requireAdmin) the storefront pings on
 * page load. Stores a minimal page-view row keyed by an opaque
 * client-supplied visitor id. Capped body, no PII.
 */
adminRouter.post(
  '/admin/track',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        if (!isConnected()) {
          res.status(204).end();
          return;
        }
        const { path, visitorId, referrer } = (req.body ?? {}) as {
          path?: string;
          visitorId?: string;
          referrer?: string;
        };
        if (
          typeof path !== 'string' ||
          typeof visitorId !== 'string' ||
          path.length === 0 ||
          path.length > 200 ||
          visitorId.length === 0 ||
          visitorId.length > 64
        ) {
          throw ApiError.badRequest('Invalid tracking payload.');
        }
        const ua = req.header('user-agent')?.slice(0, 256);
        const ref =
          typeof referrer === 'string' && referrer.length <= 256
            ? referrer
            : undefined;
        await PageViewModel.create({
          path,
          visitorId,
          referrer: ref,
          userAgent: ua,
        });
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    })();
  },
);

/**
 * GET /api/admin/subscribers
 * Returns every newsletter subscriber, newest first.
 */
adminRouter.get('/admin/subscribers', requireAdmin, async (_req, res, next) => {
  try {
    if (!isConnected()) {
      res.status(200).json({ data: [] });
      return;
    }
    const rows = await SubscriberModel.find().sort({ createdAt: -1 }).limit(1000);
    res.status(200).json({ data: rows.map((r) => r.toJSON()) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/subscribers/:id
 * Hard-removes a subscriber so the admin can scrub bounces / unsubscribes.
 */
adminRouter.delete(
  '/admin/subscribers/:id',
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id) || !isConnected()) {
        throw ApiError.notFound('Subscriber not found.');
      }
      const removed = await SubscriberModel.findByIdAndDelete(id);
      if (!removed) {
        throw ApiError.notFound('Subscriber not found.');
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/admin/newsletters
 * Sent-newsletter history so the admin can re-read or audit past sends.
 */
adminRouter.get('/admin/newsletters', requireAdmin, async (_req, res, next) => {
  try {
    if (!isConnected()) {
      res.status(200).json({ data: [] });
      return;
    }
    const rows = await NewsletterModel.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ data: rows.map((r) => r.toJSON()) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/newsletter
 * Records a newsletter campaign and counts recipients. Actually wiring
 * an SMTP/Resend/SendGrid provider is a one-line swap here — keeping
 * the surface stable so a real provider can drop in later. The
 * incoming HTML is sanitized so a copy/paste from a malicious source
 * can't smuggle <script> or event handlers into the persisted record.
 */
adminRouter.post(
  '/admin/newsletter',
  requireAdmin,
  async (req, res, next) => {
    try {
      const { subject, bodyHtml } = (req.body ?? {}) as {
        subject?: string;
        bodyHtml?: string;
      };
      if (typeof subject !== 'string' || subject.trim().length < 2) {
        throw ApiError.badRequest('Subject is required.');
      }
      if (typeof bodyHtml !== 'string' || bodyHtml.trim().length < 2) {
        throw ApiError.badRequest('Body is required.');
      }
      if (subject.length > 200) {
        throw ApiError.badRequest('Subject too long (max 200 chars).');
      }
      if (bodyHtml.length > 50_000) {
        throw ApiError.badRequest('Body too long (max 50,000 chars).');
      }
      if (!isConnected()) {
        res
          .status(200)
          .json({ data: { recipientCount: 0, sent: true, demo: true } });
        return;
      }

      const safeBody = sanitizeHtml(bodyHtml);
      const recipientCount = await SubscriberModel.countDocuments();

      const saved = await NewsletterModel.create({
        subject: subject.trim().slice(0, 200),
        bodyHtml: safeBody,
        recipientCount,
      });

      // Hook a real provider here when one is configured. Until then
      // the record-and-return flow lets the admin exercise the full UI
      // and audit past sends.
      // eslint-disable-next-line no-console
      console.log(
        `[newsletter] would send "${saved.subject}" to ${recipientCount} subscriber(s)`,
      );

      res
        .status(201)
        .json({ data: { ...saved.toJSON(), recipientCount, sent: true } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/admin/reset
 *
 * Nuke button: wipes orders, subscribers, page views, newsletters, and
 * resets every product variant's stock back to the seed default. Used
 * during a hard demo reset. Requires `{ confirm: "RESET" }` in the
 * body so a casual mis-click can't trip it.
 */
adminRouter.post('/admin/reset', requireAdmin, async (req, res, next) => {
  try {
    const { confirm } = (req.body ?? {}) as { confirm?: string };
    if (confirm !== 'RESET') {
      throw ApiError.badRequest('Pass { confirm: "RESET" } to confirm.');
    }
    if (!isConnected()) {
      res.status(200).json({
        data: {
          orders: 0,
          subscribers: 0,
          pageViews: 0,
          newsletters: 0,
          productsReset: 0,
        },
      });
      return;
    }
    const [orders, subscribers, pageViews, newsletters] = await Promise.all([
      OrderModel.deleteMany({}),
      SubscriberModel.deleteMany({}),
      PageViewModel.deleteMany({}),
      NewsletterModel.deleteMany({}),
    ]);

    // Top variant stock back up to a sensible baseline so the
    // storefront stays buyable after the wipe. We don't have the
    // original seed numbers in-process; 100 per variant is plenty for
    // a demo and matches the spirit of the seed script.
    const products = await ProductModel.find();
    for (const p of products) {
      for (const v of p.variants) {
        v.stock = 100;
      }
      await p.save();
    }

    res.status(200).json({
      data: {
        orders: orders.deletedCount ?? 0,
        subscribers: subscribers.deletedCount ?? 0,
        pageViews: pageViews.deletedCount ?? 0,
        newsletters: newsletters.deletedCount ?? 0,
        productsReset: products.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Conservative HTML sanitizer for newsletter bodies.
 *
 * Allows only inline formatting tags + headings + lists + links and
 * strips all event handlers / javascript: hrefs. Not a substitute for
 * a hardened library if user-supplied HTML ever flows back into the
 * public site, but the dashboard renders this via `dangerouslySetInner
 * HTML` for the preview and the data is otherwise stored as-is — so
 * this layer is the line of defence.
 */
function sanitizeHtml(input: string): string {
  const allowedTags = new Set([
    'p',
    'br',
    'b',
    'strong',
    'i',
    'em',
    'u',
    'h1',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'a',
    'div',
    'span',
    'blockquote',
  ]);
  // Strip <script> / <style> blocks entirely (including their contents).
  let out = input.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Strip every on* attribute and javascript: hrefs/srcs.
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/javascript\s*:/gi, '');
  // Drop tags that aren't in the allow list (keep their text content).
  out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    return allowedTags.has(tag.toLowerCase()) ? match : '';
  });
  return out;
}
