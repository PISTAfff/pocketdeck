/**
 * GET /api/products/:slug
 *
 * Returns the full product document (including variants[] for stock counts)
 * or 404 if not found.
 */
import { Router } from 'express';
import type {
  ApiSuccessResponse,
  Product as ProductT,
} from '@pocketdeck/types';

import { isConnected } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { ProductModel } from '../models/Product.js';

export const productsRouter = Router();

productsRouter.get('/products/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  try {
    if (!isConnected()) {
      throw ApiError.notFound('Product not found.');
    }
    const doc = await ProductModel.findOne({ slug });
    if (!doc) {
      throw ApiError.notFound('Product not found.');
    }
    const payload: ApiSuccessResponse<ProductT> = {
      data: doc.toJSON() as unknown as ProductT,
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});
